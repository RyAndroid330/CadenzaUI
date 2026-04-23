import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
    filter: { uuid: id },
    limit: 1,
  });

  if (!rows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const row = rows[0];

  const taskName = String(row.taskName ?? '');
  const serviceName = String(row.serviceName ?? '');

  // Fetch task definition for description and functionString
  let description = '';
  let functionString = '';
  try {
    const taskDefs = await delegateQuery<Record<string, unknown>>(address, port, 'Query task', {
      filter: { name: taskName, service_name: serviceName },
      limit: 1,
    });
    if (taskDefs.length) {
      description = String(taskDefs[0].description ?? '');
      functionString = String(taskDefs[0].functionString ?? '');
    }
  } catch (_) {}

  return {
    uuid: String(row.uuid ?? ''),
    name: taskName,
    service: serviceName,
    serviceName,
    isRunning: Boolean(row.isRunning),
    isComplete: Boolean(row.isComplete),
    errored: Boolean(row.errored),
    failed: Boolean(row.failed),
    progress: row.progress != null ? Number(row.progress) : 0,
    layerIndex: row.layerIndex != null ? Number(row.layerIndex) : null,
    routineExecutionId: String(row.routineExecutionId ?? ''),
    traceId: String(row.executionTraceId ?? ''),
    executionTraceId: String(row.executionTraceId ?? ''),
    previousTaskExecutionIds: Array.isArray(row.previousTaskExecutionIds)
      ? row.previousTaskExecutionIds
      : [],
    started: String(row.started ?? ''),
    ended: String(row.ended ?? ''),
    created: String(row.created ?? ''),
    inputContext: row.context ?? null,
    outputContext: row.resultContext ?? null,
    description,
    functionString,
  };
});
