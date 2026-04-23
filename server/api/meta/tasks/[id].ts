import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task', {
    filter: { name: id, is_meta: true },
    limit: 1,
  });

  if (!rows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const row = rows[0];

  return {
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    service: String(row.serviceName ?? ''),
    version: String(row.version ?? ''),
    layerIndex: row.layerIndex != null ? Number(row.layerIndex) : 0,
    isUnique: Boolean(row.isUnique),
    concurrency: row.concurrency != null ? Number(row.concurrency) : 1,
    isMeta: Boolean(row.isMeta),
    signals: row.signals ?? {},
  };
});
