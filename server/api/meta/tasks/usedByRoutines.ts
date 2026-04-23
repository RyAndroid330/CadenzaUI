import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const taskName = String(q.taskName ?? '');
  if (!taskName) throw createError({ statusCode: 400, message: 'Missing taskName' });

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_to_routine_map', {
    filter: { task_name: taskName },
    limit: 200,
  });

  return {
    routines: rows.map((row) => ({
      name: String(row.routineName ?? ''),
      service: String(row.serviceName ?? ''),
    })),
  };
});
