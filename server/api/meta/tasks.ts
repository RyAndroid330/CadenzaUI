import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task', {
    filter: { is_meta: true },
    sort: { name: 'asc' },
    limit: 500,
  });

  return {
    tasks: rows.filter((row) => Boolean(row.isMeta)).map((row) => ({
      uuid: String(row.uuid ?? ''),
      name: String(row.name ?? ''),
      description: String(row.description ?? ''),
      service: String(row.serviceName ?? ''),
      version: Number(row.version ?? 0),
      layerIndex: row.layerIndex != null ? Number(row.layerIndex) : null,
    })),
  };
});
