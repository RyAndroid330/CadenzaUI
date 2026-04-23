import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const routineName = String(q.routineName ?? '');
  const limit = Math.min(parseInt((q.limit as string) || '50', 10) || 50, 200);
  if (!routineName) throw createError({ statusCode: 400, message: 'Missing routineName' });

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query routine_execution', {
    filter: { name: routineName },
    sort: { created: 'desc' },
    limit,
  });

  return {
    executions: rows.map((row) => ({
      uuid: String(row.uuid ?? ''),
      name: String(row.name ?? ''),
      service: String(row.serviceName ?? ''),
      isRunning: Boolean(row.isRunning),
      isComplete: Boolean(row.isComplete),
      errored: Boolean(row.errored),
      progress: row.progress != null ? Number(row.progress) : 0,
      created: String(row.created ?? ''),
    })),
  };
});
