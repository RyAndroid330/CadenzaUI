import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const type = String(q.type ?? 'task');
  const name = String(q.name ?? '');
  if (!name) return { series: [] };

  let table: string;
  const filter: Record<string, unknown> = {};

  if (type === 'routine') {
    table = 'Query routine_execution';
    filter.name = name;
  } else if (type === 'service') {
    table = 'Query task_execution';
    filter.service_name = name;
  } else {
    table = 'Query task_execution';
    filter.task_name = name;
  }

  const rows = await delegateQuery<Record<string, unknown>>(address, port, table, {
    filter,
    sort: { created: 'asc' },
    limit: 500,
  });

  // Group rows by day and compute min/avg/max execution time in seconds
  const byDay = new Map<string, number[]>();
  for (const row of rows) {
    const started = row.started ? new Date(String(row.started)) : null;
    const ended = row.ended ? new Date(String(row.ended)) : null;
    if (!started || !ended || isNaN(started.getTime()) || isNaN(ended.getTime())) continue;
    const elapsed = (ended.getTime() - started.getTime()) / 1000;
    if (elapsed < 0) continue;
    const day = started.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(elapsed);
  }

  const slowest: [number, number][] = [];
  const average: [number, number][] = [];
  const fastest: [number, number][] = [];

  for (const [day, times] of [...byDay.entries()].sort()) {
    const ts = new Date(day).getTime();
    slowest.push([ts, Math.max(...times)]);
    average.push([ts, times.reduce((s, t) => s + t, 0) / times.length]);
    fastest.push([ts, Math.min(...times)]);
  }

  return {
    series: [
      { name: 'Slowest', data: slowest },
      { name: 'Average', data: average },
      { name: 'Fastest', data: fastest },
    ],
  };
});
