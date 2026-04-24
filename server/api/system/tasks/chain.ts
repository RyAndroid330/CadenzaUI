import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const taskName = String(q.taskName ?? '');
  if (!taskName) throw createError({ statusCode: 400, message: 'Missing taskName' });

  try {
    const [graphResult, taskDefResult] = await Promise.allSettled([
      delegateQuery<Record<string, unknown>>(address, port, 'Query directional_task_graph_map', { limit: 2000 }),
      delegateQuery<Record<string, unknown>>(address, port, 'Query task', { filter: { is_meta: false }, limit: 500 }),
    ]);

    const graphRows = graphResult.status === 'fulfilled' ? graphResult.value : [];
    const taskDefRows = taskDefResult.status === 'fulfilled' ? taskDefResult.value : [];

    // Build adjacency in both directions
    const successors = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();
    for (const g of graphRows) {
      const prev = String(g.predecessorTaskName ?? '');
      const next = String(g.taskName ?? '');
      if (!prev || !next) continue;
      if (!successors.has(prev)) successors.set(prev, []);
      successors.get(prev)!.push(next);
      if (!predecessors.has(next)) predecessors.set(next, []);
      predecessors.get(next)!.push(prev);
    }

    // BFS in both directions from taskName
    const visited = new Set<string>();
    const queue = [taskName];
    while (queue.length) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const n of (successors.get(cur) ?? [])) if (!visited.has(n)) queue.push(n);
      for (const p of (predecessors.get(cur) ?? [])) if (!visited.has(p)) queue.push(p);
    }

    const taskDefMap = new Map(taskDefRows.map((t) => [String(t.name ?? ''), t]));

    const chain = Array.from(visited).map((name) => {
      const task = taskDefMap.get(name);
      const prevNames = predecessors.get(name) ?? [];
      return {
        name,
        label: name,
        description: task ? String(task.description ?? '') : '',
        service: task ? String(task.serviceName ?? '') : '',
        isSelected: name === taskName,
        previousTaskExecutionName: prevNames.length === 1 ? prevNames[0] : prevNames.length > 1 ? prevNames : null,
      };
    });

    return { chain: chain.length ? chain : [{ name: taskName, label: taskName, description: '', previousTaskExecutionName: null, isSelected: true }] };
  } catch (e) {
    console.error('chain API error:', e);
    return { chain: [{ name: taskName, label: taskName, description: '', previousTaskExecutionName: null, isSelected: true }] };
  }
});
