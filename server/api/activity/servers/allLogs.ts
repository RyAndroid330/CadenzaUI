import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const limit = Math.min(parseInt((q.limit as string) || '100', 10) || 100, 500);
  const page = Math.max(parseInt((q.page as string) || '1', 10) || 1, 1);
  const offset = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (q.level) filter.level = q.level;

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query system_log', {
    filter,
    sort: { created: 'desc' },
    limit,
    offset,
  });

  return {
    logs: rows.map((row) => ({
      uuid: String(row.uuid ?? ''),
      created: String(row.created ?? ''),
      level: String(row.level ?? ''),
      message: String(row.message ?? ''),
      serviceName: String(row.serviceName ?? ''),
      serviceInstanceId: String(row.serviceInstanceId ?? ''),
      subjectServiceName: String(row.subjectServiceName ?? ''),
      subjectServiceInstanceId: String(row.subjectServiceInstanceId ?? ''),
      data: row.data ?? {},
    })),
  };
});
