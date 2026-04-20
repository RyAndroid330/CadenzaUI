import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const q = getQuery(event);
  const limit = Math.min(parseInt((q.limit as string) || '200', 10) || 200, 500);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query service_instance', {
    filter: { deleted: false },
    sort: { modified: 'desc' },
    limit,
  });

  return {
    instances: rows.map((row) => ({
      uuid: String(row.uuid ?? ''),
      service: String(row.serviceName ?? ''),
      isActive: Boolean(row.isActive),
      isPrimary: Boolean(row.isPrimary),
      isDatabase: Boolean(row.isDatabase),
      isFrontend: Boolean(row.isFrontend),
      isBlocked: Boolean(row.isBlocked),
      created: String(row.created ?? ''),
    })),
  };
});
