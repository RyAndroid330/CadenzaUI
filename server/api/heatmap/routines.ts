import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const serviceName = q.service as string | undefined;
  const routineName = q.routineName as string | undefined;

  const filter: Record<string, unknown> = {};
  if (serviceName) filter.service_name = serviceName;
  if (routineName) filter.name = routineName;

  // Fetch up to 5000 routine executions to build heatmap
  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query routine_execution', {
    filter,
    sort: { created: 'desc' },
    limit: 5000,
  });

  // Group by date and hour
  const dateHourMap: Record<string, Record<number, number>> = {};
  for (const row of rows) {
    const raw = (row.created as string) ?? '';
    if (!raw) continue;
    const d = new Date(raw);
    if (isNaN(d.getTime())) continue;
    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const hour = d.getHours();
    if (!dateHourMap[dateStr]) dateHourMap[dateStr] = {};
    dateHourMap[dateStr][hour] = (dateHourMap[dateStr][hour] ?? 0) + 1;
  }

  const data = Object.entries(dateHourMap).flatMap(([date, hours]) =>
    Object.entries(hours).map(([hour, executions]) => ({
      date,
      hour: Number(hour),
      executions,
    }))
  );

  return { data };
});
