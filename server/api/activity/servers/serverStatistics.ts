import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const serviceInstanceId = String(q.serviceInstanceId ?? '');
  if (!serviceInstanceId) return { series: [] };

  const [taskRows, signalRows] = await Promise.allSettled([
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
      filter: { service_instance_id: serviceInstanceId },
      sort: { created: 'asc' },
      limit: 500,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query signal_emission', {
      filter: { service_instance_id: serviceInstanceId },
      sort: { created: 'asc' },
      limit: 500,
    }),
  ]);

  const tasks = taskRows.status === 'fulfilled' ? taskRows.value : [];
  const signals = signalRows.status === 'fulfilled' ? signalRows.value : [];

  const bucketHour = (ts: string) => {
    const d = new Date(ts);
    d.setMinutes(0, 0, 0);
    return d.getTime();
  };

  const buildSeries = (rows: Record<string, unknown>[], tsField: string, name: string) => {
    const map = new Map<number, number>();
    for (const row of rows) {
      const ts = row[tsField] as string | null;
      if (!ts) continue;
      const h = bucketHour(ts);
      map.set(h, (map.get(h) ?? 0) + 1);
    }
    if (!map.size) return null;
    const data = Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([t, v]) => [t, v]);
    return { name, data };
  };

  const series: any[] = [];
  const taskSeries = buildSeries(tasks, 'started', 'Task Count');
  const signalSeries = buildSeries(signals, 'created', 'Signal Count');
  if (taskSeries) series.push(taskSeries);
  if (signalSeries) series.push(signalSeries);

  // Build shared timestamps for resource mock series
  const allTs = series.flatMap((s) => s.data.map((d: any) => d[0]));
  const timestamps = allTs.length > 0 ? [...new Set(allTs)].sort((a, b) => a - b) : (() => {
    const now = Date.now();
    const hour = 3600000;
    const base = now - (now % hour);
    return Array.from({ length: 6 }, (_, i) => base - (5 - i) * hour);
  })();

  const rand = (min: number, max: number) => Math.round(Math.random() * (max - min) + min);
  series.push(
    { name: 'CPU (%)', data: timestamps.map((t) => [t, rand(5, 65)]) },
    { name: 'RAM (%)', data: timestamps.map((t) => [t, rand(10, 80)]) },
    { name: 'Network (%)', data: timestamps.map((t) => [t, rand(1, 50)]) },
  );

  return { series };
});
