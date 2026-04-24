import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query service', {
    sort: { name: 'asc' },
    limit: 500,
  });

  return {
    services: rows.filter((row) => !row.isMeta).map((row) => ({
      uuid: String(row.uuid ?? ''),
      name: String(row.name ?? ''),
      description: String(row.description ?? ''),
    })),
  };
});
