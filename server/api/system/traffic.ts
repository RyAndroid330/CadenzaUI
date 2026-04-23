import { readBody } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'POST') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const body = await readBody(event);
  const edges: Array<{ id: string; sourceName?: string; targetName?: string }> = body?.edges ?? [];
  const timeFilter = body?.timeFilter ?? null;

  if (!edges.length) return { traffic: [] };

  // Build date filter for task_executions
  const filter: Record<string, unknown> = {};
  if (timeFilter?.period && timeFilter.period !== 'all') {
    const now = new Date();
    let cutoff: Date;
    if (timeFilter.period === 'hour') cutoff = new Date(now.getTime() - timeFilter.value * 3600 * 1000);
    else if (timeFilter.period === 'day') cutoff = new Date(now.getTime() - timeFilter.value * 86400 * 1000);
    else cutoff = new Date(now.getTime() - timeFilter.value * 365 * 86400 * 1000);
    filter.started_after = cutoff.toISOString();
  }

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
    filter,
    sort: { created: 'desc' },
    limit: 5000,
  });

  // Count executions per task name
  const taskCounts: Record<string, number> = {};
  for (const row of rows) {
    const n = String(row.taskName ?? '');
    if (n) taskCounts[n] = (taskCounts[n] ?? 0) + 1;
  }

  const traffic = edges.map((edge) => {
    const sourceCount = edge.sourceName ? (taskCounts[edge.sourceName] ?? 0) : 0;
    const targetCount = edge.targetName ? (taskCounts[edge.targetName] ?? 0) : 0;
    return {
      edgeId: edge.id,
      traffic: Math.min(sourceCount, targetCount),
    };
  });

  return { traffic };
});
