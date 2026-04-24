import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const type = String(q.type ?? '');
  const name = String(q.name ?? '');

  let table: string;
  const filter: Record<string, unknown> = {};

  if (type === 'task') {
    table = 'Query task_execution';
    if (name) filter.task_name = name;
  } else if (type === 'signal') {
    table = 'Query signal_emission';
    if (name) filter.signal_name = name;
  } else {
    table = 'Query routine_execution';
    if (name) filter.name = name;
  }

  const rows = await delegateQuery<Record<string, unknown>>(address, port, table, {
    filter,
    limit: 5000,
  });

  if (type === 'signal') {
    // signal_emission has no errored/failed — every emission is a "success"
    return [{ isComplete: rows.length, errored: 0, failed: 0, executions: rows.length }];
  }

  let isComplete = 0, errored = 0, failed = 0;
  for (const row of rows) {
    if (row.errored) errored++;
    else if (row.failed) failed++;
    else if (row.isComplete) isComplete++;
  }

  return [{ isComplete, errored, failed, executions: rows.length }];
});
