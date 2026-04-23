import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const [traceRows, routineRows] = await Promise.all([
    delegateQuery<Record<string, unknown>>(address, port, 'Query execution_trace', {
      filter: { uuid: id },
      limit: 1,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query routine_execution', {
      filter: { execution_trace_id: id },
      sort: { created: 'asc' },
      limit: 200,
    }),
  ]);

  if (!traceRows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const trace = traceRows[0];
  const serviceName = String(trace.serviceName ?? '');
  const traceUuid = String(trace.uuid ?? '');

  // Fetch all task_executions for all routines in parallel
  const taskResults = await Promise.allSettled(
    routineRows.map((r) =>
      delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
        filter: { routine_execution_id: String(r.uuid ?? '') },
        sort: { created: 'asc' },
        limit: 200,
      })
    )
  );

  // Build NestedFlowMap nodes and edges
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

    // Routine node
    nodes.push({
      id: routineId,
      type: 'custom',
      nodeType: 'routine',
      parentNode: traceUuid,
      data: { label: routineName || routineId, description: '', isParent: true },
    });

    // Task nodes for this routine
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

      // Edges from previous_task_execution_ids
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

  return {
    uuid: traceUuid,
    service: serviceName,
    created: String(trace.created ?? ''),
    routines,
    nodes,
    edges,
  };
});
