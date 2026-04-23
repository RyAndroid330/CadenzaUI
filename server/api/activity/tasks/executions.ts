import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const taskName = String(q.taskName ?? '');
  const limit = Math.min(parseInt((q.limit as string) || '50', 10) || 50, 200);
  if (!taskName) throw createError({ statusCode: 400, message: 'Missing taskName' });

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
    filter: { task_name: taskName },
    sort: { created: 'desc' },
    limit,
  });

  return {
    executions: rows.map((row) => ({
      uuid: String(row.uuid ?? ''),
      name: String(row.taskName ?? ''),
      service: String(row.serviceName ?? ''),
      isRunning: Boolean(row.isRunning),
      isComplete: Boolean(row.isComplete),
      errored: Boolean(row.errored),
      failed: Boolean(row.failed),
      progress: row.progress != null ? Number(row.progress) : 0,
      started: String(row.started ?? ''),
      ended: String(row.ended ?? ''),
      created: String(row.created ?? ''),
    })),
  };
});
