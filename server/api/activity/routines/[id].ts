import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const routineRows = await delegateQuery<Record<string, unknown>>(address, port, 'Query routine_execution', {
    filter: { uuid: id },
    limit: 1,
  });

  if (!routineRows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const row = routineRows[0];

  const [taskResult, signalResult] = await Promise.allSettled([
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
      filter: { routine_execution_id: id },
      sort: { created: 'asc' },
      limit: 200,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query signal_emission', {
      filter: { routine_execution_id: id },
      sort: { created: 'asc' },
      limit: 200,
    }),
  ]);

  const taskRows = taskResult.status === 'fulfilled' ? taskResult.value : [];
  const signalRows = signalResult.status === 'fulfilled' ? signalResult.value : [];

  const started = row.started ? String(row.started) : String(row.created ?? '');
  const ended = row.ended ? String(row.ended) : '';
  const durationMs = started && ended ? new Date(ended).getTime() - new Date(started).getTime() : 0;
  const progress = row.progress != null ? Number(row.progress) : 0;

  const tasks = taskRows.map((t) => {
    let prevIds: string[] = [];
    const raw = t.previousTaskExecutionIds;
    if (Array.isArray(raw)) prevIds = raw.map(String).filter(Boolean);
    else if (typeof raw === 'string' && raw.startsWith('{'))
      prevIds = raw.replace(/^\{|\}$/g, '').split(',').map((s) => s.trim()).filter(Boolean);

    return {
      uuid: String(t.uuid ?? ''),
      type: 'task',
      name: String(t.taskName ?? ''),
      label: String(t.taskName ?? ''),
      description: '',
      layer_index: t.layerIndex != null ? Number(t.layerIndex) : null,
      errored: Boolean(t.errored),
      failed: Boolean(t.failed),
      isComplete: Boolean(t.isComplete),
      isRunning: Boolean(t.isRunning),
      progress: t.progress != null ? Number(t.progress) : 0,
      created: t.created ? String(t.created) : null,
      started: t.started ? String(t.started) : (t.created ? String(t.created) : null),
      ended: t.ended ? String(t.ended) : null,
      previousTaskExecutionId: prevIds.length === 1 ? prevIds[0] : prevIds.length > 1 ? prevIds : null,
    };
  });

  // Fetch triggered tasks for each signal to build edges
  const triggeredResults = await Promise.allSettled(
    signalRows.map((s) =>
      delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
        filter: { signal_emission_id: String(s.uuid ?? '') },
        limit: 50,
      })
    )
  );

  const signals = signalRows.map((s, idx) => {
    const emittingTaskId = String(s.taskExecutionId ?? '');
    const triggered = triggeredResults[idx]?.status === 'fulfilled' ? triggeredResults[idx].value : [];
    const triggeredIds = triggered.map((t) => String(t.uuid ?? '')).filter(Boolean);
    const created = s.created ? String(s.created) : null;
    return {
      uuid: String(s.uuid ?? ''),
      type: 'signal',
      signal: true,
      name: String(s.signalName ?? ''),
      label: String(s.signalName ?? ''),
      description: '',
      created,
      started: created,
      ended: created,
      progress: 100,
      isComplete: true,
      isRunning: false,
      errored: false,
      failed: false,
      previousTaskExecutionId: emittingTaskId || null,
      triggeredTaskIds: triggeredIds,
    };
  });

  return {
    uuid: String(row.uuid ?? ''),
    name: String(row.name ?? ''),
    label: String(row.name ?? ''),
    type: 'routine',
    serviceName: String(row.serviceName ?? ''),
    executionTraceId: String(row.executionTraceId ?? ''),
    status: row.isComplete ? 'check' : row.isRunning ? 'play_arrow' : row.errored ? 'close' : 'schedule',
    isRunning: Boolean(row.isRunning),
    isComplete: Boolean(row.isComplete),
    errored: Boolean(row.errored),
    failed: Boolean(row.failed),
    progress,
    started,
    ended,
    duration: durationMs > 0 ? (durationMs / 1000).toFixed(2) : 0,
    created: String(row.created ?? ''),
    tasks,
    signals,
  };
});
