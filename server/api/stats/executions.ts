import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const type = q.type as string | undefined; // 'routine' | 'task' | undefined
  const name = q.name as string | undefined;

  let taskName: string;
  const filter: Record<string, unknown> = {};

  if (type === 'task') {
    taskName = 'Query task_execution';
    if (name) filter.task_name = name;
  } else {
    taskName = 'Query routine_execution';
    if (name) filter.name = name;
  }

  const rows = await delegateQuery<Record<string, unknown>>(address, port, taskName, {
    filter,
    limit: 5000,
  });

  let isComplete = 0, errored = 0, failed = 0;
  for (const row of rows) {
    if (row.errored) errored++;
    else if (row.failed) failed++;
    else if (row.isComplete) isComplete++;
  }

  return [{ isComplete, errored, failed, executions: rows.length }];
});
