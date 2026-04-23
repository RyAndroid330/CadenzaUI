import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const limit = Math.min(parseInt((q.limit as string) || '50', 10) || 50, 200);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query execution_trace', {
    sort: { created: 'desc' },
    limit: limit + 1,
  });

  return rows.slice(0, limit).map((row) => ({
    uuid: String(row.uuid ?? ''),
    service: String(row.serviceName ?? ''),
    created: String(row.created ?? ''),
  }));
});
