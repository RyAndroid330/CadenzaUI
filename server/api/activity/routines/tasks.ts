import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const routineExecutionId = String(q.routineExecutionId ?? '');
  if (!routineExecutionId) throw createError({ statusCode: 400, message: 'Missing routineExecutionId' });

  const execRows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
    filter: { routine_execution_id: routineExecutionId },
    sort: { created: 'asc' },
    limit: 200,
  });

  // Return flat array matching source tasksInRoutines.ts format
  return execRows.map((row) => ({
    uuid: String(row.uuid ?? ''),
    type: 'task',
    name: String(row.taskName ?? ''),
    label: String(row.taskName ?? ''),
    description: '',
    layer_index: row.layerIndex != null ? Number(row.layerIndex) : null,
    errored: Boolean(row.errored),
    failed: Boolean(row.failed),
    isComplete: Boolean(row.isComplete),
    isRunning: Boolean(row.isRunning),
    is_running: Boolean(row.isRunning),
    is_scheduled: Boolean(row.isScheduled),
    progress: row.progress != null ? Number(row.progress) : 0,
    created: row.created ? String(row.created) : null,
    started: row.started ? String(row.started) : (row.created ? String(row.created) : null),
    ended: row.ended ? String(row.ended) : null,
    executionTraceId: String(row.executionTraceId ?? ''),
    previousTaskExecutionName: null,
    previousTaskExecutionId: Array.isArray(row.previousTaskExecutionIds)
      ? row.previousTaskExecutionIds
      : (row.previousTaskExecutionIds ? [row.previousTaskExecutionIds] : null),
  }));
});
