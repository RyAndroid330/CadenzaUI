import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const [traceResult, routineResult, signalResult] = await Promise.allSettled([
    delegateQuery<Record<string, unknown>>(address, port, 'Query execution_trace', {
      filter: { uuid: id },
      limit: 1,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query routine_execution', {
      filter: { execution_trace_id: id },
      sort: { created: 'asc' },
      limit: 200,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query signal_emission', {
      filter: { execution_trace_id: id },
      sort: { created: 'asc' },
      limit: 500,
    }),
  ]);

  const traceRows = traceResult.status === 'fulfilled' ? traceResult.value : [];
  const routineRows = routineResult.status === 'fulfilled' ? routineResult.value : [];
  const signalRows = signalResult.status === 'fulfilled' ? signalResult.value : [];

  if (!traceRows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const trace = traceRows[0];
  const serviceName = String(trace.serviceName ?? '');
  const traceUuid = String(trace.uuid ?? '');

  // Fetch task_executions for all routines + triggered tasks for each signal in parallel
  const [taskResults, triggeredResults] = await Promise.all([
    Promise.allSettled(
      routineRows.map((r) =>
        delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
          filter: { routine_execution_id: String(r.uuid ?? '') },
          sort: { created: 'asc' },
          limit: 200,
        })
      )
    ),
    Promise.allSettled(
      signalRows.map((s) =>
        delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
          filter: { signal_emission_id: String(s.uuid ?? '') },
          limit: 50,
        })
      )
    ),
  ]);

  const nodes: any[] = [];
  const edges: any[] = [];

  // Service node (root)
  nodes.push({
    id: traceUuid,
    type: 'custom',
    nodeType: 'service',
    data: { label: serviceName || traceUuid, description: '', isParent: true },
  });

  const routines = routineRows.map((row, idx) => {
    const routineId = String(row.uuid ?? '');
    const routineName = String(row.name ?? '');

    nodes.push({
      id: routineId,
      type: 'custom',
      nodeType: 'routine',
      parentNode: traceUuid,
      data: { label: routineName || routineId, description: '', isParent: true },
    });

    const taskRows = taskResults[idx]?.status === 'fulfilled' ? taskResults[idx].value : [];
    for (const t of taskRows) {
      const taskId = String(t.uuid ?? '');
      if (!taskId) continue;
      nodes.push({
        id: taskId,
        type: 'custom',
        nodeType: 'task',
        parentNode: routineId,
        errored: Boolean(t.errored),
        failed: Boolean(t.failed),
        isComplete: Boolean(t.isComplete),
        progress: t.progress != null ? Number(t.progress) : 0,
        data: {
          label: String(t.taskName ?? ''),
          description: '',
          uuid: taskId,
          started: t.started ? String(t.started) : null,
          ended: t.ended ? String(t.ended) : null,
          created: t.created ? String(t.created) : null,
          type: 'task',
        },
      });

      let prevIds: string[] = [];
      const raw = t.previousTaskExecutionIds;
      if (Array.isArray(raw)) {
        prevIds = raw.map(String).filter(Boolean);
      } else if (typeof raw === 'string' && raw.startsWith('{')) {
        prevIds = raw.replace(/^\{|\}$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      }
      for (const prevId of prevIds) {
        edges.push({ id: `e${prevId}-${taskId}`, source: prevId, target: taskId });
      }
    }

    return {
      uuid: routineId,
      name: routineName,
      label: routineName,
      service: String(row.serviceName ?? ''),
      isRunning: Boolean(row.isRunning),
      isComplete: Boolean(row.isComplete),
      errored: Boolean(row.errored),
      progress: row.progress != null ? Number(row.progress) : 0,
      created: String(row.created ?? ''),
      started: String(row.started ?? row.created ?? ''),
      ended: String(row.ended ?? ''),
    };
  });

  // Signal nodes and edges
  const signals = signalRows.map((s, idx) => {
    const sigId = String(s.uuid ?? '');
    const sigName = String(s.signalName ?? '');
    const routineId = String(s.routineExecutionId ?? '');
    const emittingTaskId = String(s.taskExecutionId ?? '');
    const created = String(s.created ?? '');

    nodes.push({
      id: sigId,
      type: 'custom',
      nodeType: 'signal',
      parentNode: routineId || traceUuid,
      data: {
        label: sigName,
        uuid: sigId,
        signal: true,
        created,
        started: created,
        ended: created,
        type: 'signal',
      },
    });

    if (emittingTaskId) {
      edges.push({ id: `e${emittingTaskId}-${sigId}`, source: emittingTaskId, target: sigId, style: { strokeDasharray: '4 2' } });
    }

    const triggered = triggeredResults[idx]?.status === 'fulfilled' ? triggeredResults[idx].value : [];
    for (const t of triggered) {
      const triggeredId = String(t.uuid ?? '');
      if (triggeredId) {
        edges.push({ id: `e${sigId}-${triggeredId}`, source: sigId, target: triggeredId, style: { strokeDasharray: '4 2' } });
      }
    }

    return {
      uuid: sigId,
      name: sigName,
      label: sigName,
      created,
      started: created,
      ended: created,
      signal: true,
    };
  });

  return {
    uuid: traceUuid,
    service: serviceName,
    created: String(trace.created ?? ''),
    routines,
    signals,
    nodes,
    edges,
  };
});
