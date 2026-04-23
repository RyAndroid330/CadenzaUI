import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const serviceInstanceId = String(q.serviceInstanceId ?? '');

  // Fetch task_executions; optionally pre-filter by service_instance_id on the task itself
  const taskFilter: Record<string, unknown> = { is_meta: false };
  if (serviceInstanceId) taskFilter.service_instance_id = serviceInstanceId;

  const [taskRows, routineRows] = await Promise.allSettled([
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
      filter: taskFilter,
      sort: { created: 'desc' },
      limit: 5000,
    }),
    // Also fetch via routine_execution.service_instance_id (matching source behavior)
    serviceInstanceId
      ? delegateQuery<Record<string, unknown>>(address, port, 'Query routine_execution', {
          filter: { service_instance_id: serviceInstanceId },
          sort: { created: 'desc' },
          limit: 1000,
        })
      : Promise.resolve([]),
  ]);

  // Build set of routine_execution uuids for this service instance
  const routineUuids = new Set<string>();
  if (routineRows.status === 'fulfilled') {
    for (const r of routineRows.value) {
      if (r.uuid) routineUuids.add(String(r.uuid));
    }
  }

  // Merge: task rows directly on this service instance OR whose routine belongs to it
  const allTasks = taskRows.status === 'fulfilled' ? taskRows.value : [];
  const rows = serviceInstanceId
    ? allTasks.filter((r) =>
        String(r.serviceInstanceId ?? '') === serviceInstanceId ||
        routineUuids.has(String(r.routineExecutionId ?? ''))
      )
    : allTasks;

  const dateHourMap: Record<string, Record<number, number>> = {};
  for (const row of rows) {
    const raw = (row.created as string) ?? '';
    if (!raw) continue;
    const d = new Date(raw);
    if (isNaN(d.getTime())) continue;
    const dateStr = d.toISOString().slice(0, 10);
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
