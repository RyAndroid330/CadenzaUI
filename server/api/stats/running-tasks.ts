import { useRuntimeConfig } from '#imports';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
    filter: { is_running: true },
    limit: 500,
  });

  const taskCounts: Record<string, number> = {};
  for (const r of rows) {
    const name = String(r.taskName ?? '');
    if (name) taskCounts[name] = (taskCounts[name] ?? 0) + 1;
  }
  const taskNames = Object.keys(taskCounts);
  return { taskNames, taskCounts };
});

