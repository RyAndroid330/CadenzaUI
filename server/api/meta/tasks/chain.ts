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

  const [graphRows, taskRows] = await Promise.all([
    delegateQuery<Record<string, unknown>>(address, port, 'Query directional_task_graph_map', {
      limit: 2000,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query task', {
      filter: { is_meta: true },
      limit: 500,
    }),
  ]);

  const edges = graphRows.map((g) => ({
    prev: String(g.predecessorTaskName ?? ''),
    next: String(g.taskName ?? ''),
  }));

  const visited = new Set<string>([taskName]);
  const queue = [taskName];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.next === cur && !visited.has(e.prev)) { visited.add(e.prev); queue.push(e.prev); }
      if (e.prev === cur && !visited.has(e.next)) { visited.add(e.next); queue.push(e.next); }
    }
  }

  const taskMap = new Map(taskRows.map((t) => [String(t.name ?? ''), t]));

  const chain = Array.from(visited).map((name) => {
    const task = taskMap.get(name);
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

  return { chain };
});
