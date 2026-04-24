import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const results = await Promise.allSettled([
    delegateQuery<Record<string, unknown>>(address, port, 'Query directional_task_graph_map', { limit: 1000 }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_to_routine_map', { limit: 1000 }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query service', { sort: { name: 'asc' }, limit: 200 }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query task', { filter: { is_meta: false }, sort: { name: 'asc' }, limit: 500 }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query signal_registry', { filter: { is_meta: false }, sort: { name: 'asc' }, limit: 200 }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_to_signal_map', { filter: { deleted: false }, limit: 1000 }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query signal_to_task_map', { filter: { deleted: false }, limit: 1000 }),
  ]);

  const ok = (i: number): Record<string, unknown>[] =>
    results[i].status === 'fulfilled' ? results[i].value : [];

  const graphRows      = ok(0);
  const routineMapRows = ok(1);
  const serviceRows    = ok(2);
  const taskRows       = ok(3);
  const signalRows     = ok(4);
  const taskToSignalRows  = ok(5);
  const signalToTaskRows  = ok(6);

  const taskSignalEdges = taskToSignalRows.map((r) => ({
    taskName:    String(r.taskName ?? ''),
    signalName:  String(r.signalName ?? ''),
    serviceName: String(r.serviceName ?? ''),
  })).filter((e) => e.taskName && e.signalName);

  const signalToTaskEdges = signalToTaskRows.map((r) => ({
    signalName:  String(r.signalName ?? ''),
    taskName:    String(r.taskName ?? ''),
    isGlobal:    Boolean(r.isGlobal),
    serviceName: String(r.serviceName ?? ''),
  })).filter((e) => e.signalName && e.taskName);

  return {
    graph: graphRows.map((r) => ({
      taskName:         String(r.taskName ?? ''),
      previousTaskName: String(r.predecessorTaskName ?? ''),
      serviceName:      String(r.serviceName ?? ''),
    })),
    routineMap: routineMapRows.map((r) => ({
      taskName:     String(r.taskName ?? ''),
      routineName:  String(r.routineName ?? ''),
      serviceName:  String(r.serviceName ?? ''),
    })),
    services: serviceRows.filter((r) => !r.isMeta).map((r) => ({ name: String(r.name ?? '') })),
    tasks: taskRows.map((r) => ({
      name:        String(r.name ?? ''),
      service:     String(r.serviceName ?? ''),
      layerIndex:  r.layerIndex != null ? Number(r.layerIndex) : 0,
      description: String(r.description ?? ''),
    })),
    signals: signalRows.map((r) => ({
      name:   String(r.name ?? ''),
      domain: String(r.domain ?? ''),
      action: String(r.action ?? ''),
    })),
    taskSignalEdges,
    signalToTaskEdges,
  };
});
