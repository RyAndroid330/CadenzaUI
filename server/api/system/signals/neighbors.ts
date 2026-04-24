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

  // Find a recent emission of this signal to resolve which task emitted it and what it triggered
  const emissionRows = await delegateQuery<Record<string, unknown>>(address, port, 'Query signal_emission', {
    filter: { signal_name: signalName },
    sort: { created: 'desc' },
    limit: 1,
  });

  if (!emissionRows.length) return { emittingTasks: [], followingTasks: [] };

  const emission = emissionRows[0];
  const taskExecutionId = String(emission.taskExecutionId ?? '');
  const emissionUuid = String(emission.uuid ?? '');

  const [emitterRows, consumerRows] = await Promise.allSettled([
    taskExecutionId
      ? delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
          filter: { uuid: taskExecutionId },
          limit: 1,
        })
      : Promise.resolve([]),
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
      filter: { signal_emission_id: emissionUuid },
      sort: { created: 'asc' },
      limit: 50,
    }),
  ]);

  const emitterExecs = emitterRows.status === 'fulfilled' ? emitterRows.value : [];
  const consumerExecs = consumerRows.status === 'fulfilled' ? consumerRows.value : [];

  const emittingTasks = emitterExecs
    .map((r) => ({ name: String(r.taskName ?? ''), description: '' }))
    .filter((t) => t.name);

  const seen = new Set<string>();
  const followingTasks = consumerExecs
    .map((r) => ({ name: String(r.taskName ?? ''), description: '' }))
    .filter((t) => t.name && !seen.has(t.name) && seen.add(t.name));

  return { emittingTasks, followingTasks };
});
