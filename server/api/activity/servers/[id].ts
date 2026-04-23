import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query service_instance', {
    filter: { uuid: id },
    limit: 1,
  });

  if (!rows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const row = rows[0];

  return {
    uuid: String(row.uuid ?? ''),
    service: String(row.serviceName ?? ''),
    isActive: Boolean(row.isActive),
    isPrimary: Boolean(row.isPrimary),
    isDatabase: Boolean(row.isDatabase),
    isFrontend: Boolean(row.isFrontend),
    isBlocked: Boolean(row.isBlocked),
    isMeta: Boolean(row.isMeta),
    address: String(row.address ?? ''),
    port: row.port != null ? Number(row.port) : null,
    cpu: row.cpu != null ? Number(row.cpu) : 0,
    gpu: row.gpu != null ? Number(row.gpu) : 0,
    ram: row.ram != null ? Number(row.ram) : 0,
    created: String(row.created ?? ''),
    modified: String(row.modified ?? ''),
  };
});
