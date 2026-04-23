import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const routineName = String(q.routineName ?? '');
  if (!routineName) throw createError({ statusCode: 400, message: 'Missing routineName' });

  const [mapRows, graphRows] = await Promise.all([
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_to_routine_map', {
      filter: { routine_name: routineName },
      limit: 200,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query directional_task_graph_map', {
      limit: 2000,
    }),
  ]);

  const taskNames = new Set(mapRows.map((r) => String(r.taskName ?? '')));

  const edges = graphRows
    .map((g) => ({ prev: String(g.predecessorTaskName ?? ''), next: String(g.taskName ?? '') }))
    .filter((e) => taskNames.has(e.prev) && taskNames.has(e.next));

  const chain = Array.from(taskNames).map((name) => {
    const prevNames = edges.filter((e) => e.next === name).map((e) => e.prev);
    return {
      name,
      label: name,
      description: '',
      previousTaskExecutionName: prevNames.length ? prevNames[0] : null,
    };
  });

  return { chain };
});
