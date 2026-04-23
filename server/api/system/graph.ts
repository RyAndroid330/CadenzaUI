import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const [graphRows, routineMapRows, serviceRows, taskRows] = await Promise.all([
    delegateQuery<Record<string, unknown>>(address, port, 'Query directional_task_graph_map', {
      limit: 1000,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_to_routine_map', {
      limit: 1000,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query service', {
      filter: { is_meta: false },
      sort: { name: 'asc' },
      limit: 200,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query task', {
      filter: { is_meta: false },
      sort: { name: 'asc' },
      limit: 500,
    }),
  ]);

  return {
    graph: graphRows.map((r) => ({
      taskName: String(r.taskName ?? ''),
      previousTaskName: String(r.predecessorTaskName ?? ''),
      serviceName: String(r.serviceName ?? ''),
    })),
    routineMap: routineMapRows.map((r) => ({
      taskName: String(r.taskName ?? ''),
      routineName: String(r.routineName ?? ''),
      serviceName: String(r.serviceName ?? ''),
    })),
    services: serviceRows.map((r) => ({ name: String(r.name ?? '') })),
    tasks: taskRows.map((r) => ({
      name: String(r.name ?? ''),
      service: String(r.serviceName ?? ''),
      layerIndex: r.layerIndex != null ? Number(r.layerIndex) : 0,
      description: String(r.description ?? ''),
    })),
  };
});
