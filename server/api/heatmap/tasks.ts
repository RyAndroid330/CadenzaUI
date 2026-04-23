import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const taskName = String(q.taskName ?? '');

  const filter: Record<string, unknown> = {};
  if (taskName) filter.task_name = taskName;

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
    filter,
    sort: { created: 'asc' },
    limit: 5000,
  });

  const grouped = new Map<string, number>();
  for (const row of rows) {
    const created = String(row.created ?? '');
    if (!created) continue;
    const d = new Date(created);
    if (isNaN(d.getTime())) continue;
    const date = d.toISOString().slice(0, 10);
    const hour = d.getHours();
    const key = `${date}::${hour}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  const data = Array.from(grouped.entries()).map(([key, count]) => {
    const [date, hourStr] = key.split('::');
    return { date, hour: Number(hourStr), executions: count };
  });

  return { data };
});
