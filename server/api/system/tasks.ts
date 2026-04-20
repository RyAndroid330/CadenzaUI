import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const q = getQuery(event);
  const limit = Math.min(parseInt((q.limit as string) || '200', 10) || 200, 500);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task', {
    filter: { is_meta: false },
    sort: { name: 'asc' },
    limit,
  });

  return {
    tasks: rows.map((row) => ({
      uuid: String(row.uuid ?? ''),
      name: String(row.name ?? ''),
      description: String(row.description ?? ''),
      service: String(row.serviceName ?? ''),
      version: Number(row.version ?? 0),
      isUnique: Boolean(row.isUnique),
      concurrency: row.concurrency != null ? Number(row.concurrency) : null,
      layerIndex: row.layerIndex != null ? Number(row.layerIndex) : null,
    })),
  };
});
