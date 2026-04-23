import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

const fallback = (taskName: string) => ({
  chain: [{ name: taskName, label: taskName, description: '', previousTaskExecutionName: null, isSelected: true }],
});

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const taskName = String(q.taskName ?? '');
  if (!taskName) throw createError({ statusCode: 400, message: 'Missing taskName' });

  try {
    // Find which routine(s) contain this task
    const routineMapRows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_to_routine_map', {
      filter: { task_name: taskName },
      limit: 10,
    });

    const routineName = routineMapRows.length ? String(routineMapRows[0].routineName ?? '') : '';
    if (!routineName) return fallback(taskName);

    // Get all tasks in that routine + graph edges + task definitions (best-effort)
    const [taskMapResult, graphResult, taskDefResult] = await Promise.allSettled([
      delegateQuery<Record<string, unknown>>(address, port, 'Query task_to_routine_map', {
        filter: { routine_name: routineName },
        limit: 200,
      }),
      delegateQuery<Record<string, unknown>>(address, port, 'Query directional_task_graph_map', {
        limit: 2000,
      }),
      delegateQuery<Record<string, unknown>>(address, port, 'Query task', {
        filter: { is_meta: false },
        limit: 500,
      }),
    ]);

    const taskMapRows = taskMapResult.status === 'fulfilled' ? taskMapResult.value : [];
    const graphRows = graphResult.status === 'fulfilled' ? graphResult.value : [];
    const taskDefRows = taskDefResult.status === 'fulfilled' ? taskDefResult.value : [];

    const taskNames = new Set(
      taskMapRows.map((r) => String(r.taskName ?? '')).filter(Boolean)
    );
    taskNames.add(taskName); // always include the requested task

    const edges = graphRows
      .map((g) => ({ prev: String(g.predecessorTaskName ?? ''), next: String(g.taskName ?? '') }))
      .filter((e) => e.prev && e.next && taskNames.has(e.prev) && taskNames.has(e.next));

    const taskDefMap = new Map(taskDefRows.map((t) => [String(t.name ?? ''), t]));

    const chain = Array.from(taskNames).map((name) => {
      const task = taskDefMap.get(name);
      const prevNames = edges.filter((e) => e.next === name).map((e) => e.prev);
      return {
        name,
        label: name,
        description: task ? String(task.description ?? '') : '',
        service: task ? String(task.serviceName ?? '') : '',
        isSelected: name === taskName,
        previousTaskExecutionName: prevNames.length ? prevNames[0] : null,
      };
    });

    return { chain: chain.length ? chain : [{ name: taskName, label: taskName, description: '', previousTaskExecutionName: null, isSelected: true }] };
  } catch (e) {
    console.error('chain API error:', e);
    return fallback(taskName);
  }
});
