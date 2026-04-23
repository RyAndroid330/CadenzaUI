import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query routine_execution', {
    filter: { uuid: id },
    limit: 1,
  });

  if (!rows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const row = rows[0];

  const started = row.started ? String(row.started) : String(row.created ?? '');
  const ended = row.ended ? String(row.ended) : '';
  const durationMs = started && ended ? new Date(ended).getTime() - new Date(started).getTime() : 0;
  const progress = row.progress != null ? Number(row.progress) : 0;

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
    inputContext: row.context ?? {},
    outputContext: row.resultContext ?? {},
  };
});
