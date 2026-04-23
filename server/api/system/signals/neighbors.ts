import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const signalName = String(q.signalName ?? '');
  if (!signalName) throw createError({ statusCode: 400, message: 'Missing signalName' });

  const emissionRows = await delegateQuery<Record<string, unknown>>(address, port, 'Query signal_emission', {
    filter: { signal_name: signalName },
    sort: { created: 'desc' },
    limit: 50,
  });

  const seenServices = new Set<string>();
  const previousTasks: { task_name: string; task_description: string }[] = [];
  for (const row of emissionRows) {
    const svc = String(row.emitterServiceName ?? '');
    if (svc && !seenServices.has(svc)) {
      seenServices.add(svc);
      previousTasks.push({ task_name: svc, task_description: `emitter service` });
    }
  }

  return { previousTasks, nextTasks: [] };
});
