import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const limit = Math.min(parseInt((q.limit as string) || '50', 10) || 50, 200);

  const filter: Record<string, unknown> = { is_meta: false };
  if (q.service) filter.service_name = q.service;

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
    filter,
    sort: { created: 'desc' },
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const tasks = rows.slice(0, limit);

  return {
    tasks: tasks.map((row) => ({
      uuid: String(row.uuid ?? ''),
      name: String(row.taskName ?? ''),
      service: String(row.serviceName ?? ''),
      status: row.isComplete ? 'check' : row.isRunning ? 'play_arrow' : row.errored ? 'close' : 'schedule',
      progress: row.progress != null ? Math.round(Number(row.progress) * 100) : 0,
      started: String(row.started ?? row.created ?? ''),
      ended: String(row.ended ?? ''),
      duration: row.started && row.ended
        ? Math.round((new Date(row.ended as string).getTime() - new Date(row.started as string).getTime()) / 1000)
        : 0,
    })),
    hasMore,
  };
});
