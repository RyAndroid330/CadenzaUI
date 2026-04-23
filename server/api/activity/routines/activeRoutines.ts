import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const page = Math.max(1, parseInt((q.page as string) || '1', 10));
  const limit = Math.min(parseInt((q.limit as string) || '50', 10) || 50, 200);
  const offset = (page - 1) * limit;

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query routine_execution', {
    filter: { is_meta: false },
    sort: { created: 'desc' },
    limit: limit + 1,
    offset,
  });

  return rows.slice(0, limit).map((row) => {
    const started = row.started ? String(row.started) : '';
    const ended = row.ended ? String(row.ended) : '';
    const durationMs = started && ended ? new Date(ended).getTime() - new Date(started).getTime() : 0;
    return {
      uuid: String(row.uuid ?? ''),
      label: String(row.name ?? ''),
      name: String(row.name ?? ''),
      service: String(row.serviceName ?? ''),
      status: row.errored ? 'errored' : row.isComplete ? 'complete' : row.isRunning ? 'running' : 'pending',
      progress: row.progress != null ? Number(row.progress) : 0,
      started,
      ended,
      duration: durationMs > 0 ? (durationMs / 1000).toFixed(2) : 0,
    };
  });
});
