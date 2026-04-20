import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const q = getQuery(event);
  const limit = Math.min(parseInt((q.limit as string) || '200', 10) || 200, 500);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query signal_registry', {
    filter: { is_meta: true },
    sort: { name: 'asc' },
    limit,
  });

  return {
    signals: rows.map((row) => ({
      name: String(row.name ?? ''),
      domain: String(row.domain ?? ''),
      action: String(row.action ?? ''),
      isGlobal: Boolean(row.isGlobal),
    })),
  };
});
