import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query signal_registry', {
    filter: { name: id, is_meta: false },
    limit: 1,
  });

  if (!rows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const row = rows[0];

  return {
    name: String(row.name ?? ''),
    domain: String(row.domain ?? ''),
    action: String(row.action ?? ''),
    isGlobal: Boolean(row.isGlobal),
    isMeta: Boolean(row.isMeta),
  };
});
