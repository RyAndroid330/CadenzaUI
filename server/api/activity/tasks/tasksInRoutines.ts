import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const taskExecutionId = String(q.task_execution_id ?? q.taskExecutionId ?? '');
  if (!taskExecutionId) throw createError({ statusCode: 400, message: 'Missing task_execution_id' });

  // Fetch the target task to get its routineExecutionId
  const targetRows = await delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
    filter: { uuid: taskExecutionId },
    limit: 1,
  });
  if (!targetRows.length) throw createError({ statusCode: 404, message: 'Task execution not found' });

  const routineExecutionId = String(targetRows[0].routineExecutionId ?? '');
  if (!routineExecutionId) {
    // Standalone task — return just the one node
    return [buildNode(targetRows[0])];
  }

  // Fetch all tasks and signal emissions in the same routine
  const [allRows, signalRows] = await Promise.all([
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
      filter: { routine_execution_id: routineExecutionId },
      sort: { created: 'asc' },
      limit: 200,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query signal_emission', {
      filter: { routine_execution_id: routineExecutionId },
      sort: { created: 'asc' },
      limit: 200,
    }),
  ]);

  const taskNodes = allRows.map(buildNode);
  const signalNodes = signalRows.map(buildSignalNode);
  return [...taskNodes, ...signalNodes];
});

function buildSignalNode(row: Record<string, unknown>) {
  const taskExecId = String(row.taskExecutionId ?? '');
  return {
    uuid: String(row.uuid ?? ''),
    id: String(row.uuid ?? ''),
    type: 'signal',
    signal: true,
    nodeType: 'signal',
    name: String(row.signalName ?? ''),
    label: String(row.signalName ?? ''),
    description: '',
    created: row.created ? String(row.created) : null,
    previousTaskExecutionId: taskExecId || null,
    previousTaskExecutionName: taskExecId || null,
  };
}

function buildNode(row: Record<string, unknown>) {
  // previous_task_execution_ids comes from DB — delegation may return as array or postgres-formatted string
  let prevIds: string[] = [];
  const raw = row.previousTaskExecutionIds;
  if (Array.isArray(raw)) {
    prevIds = raw.map(String).filter(Boolean);
  } else if (typeof raw === 'string' && raw.startsWith('{')) {
    // PostgreSQL array notation: {uuid1,uuid2}
    prevIds = raw.replace(/^\{|\}$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  }

  return {
    uuid: String(row.uuid ?? ''),
    id: String(row.uuid ?? ''),
    type: 'task',
    name: String(row.taskName ?? ''),
    label: String(row.taskName ?? ''),
    description: '',
    layer_index: row.layerIndex != null ? Number(row.layerIndex) : null,
    errored: Boolean(row.errored),
    failed: Boolean(row.failed),
    isComplete: Boolean(row.isComplete),
    isRunning: Boolean(row.isRunning),
    progress: row.progress != null ? Number(row.progress) : 0,
    created: row.created ? String(row.created) : null,
    started: row.started ? String(row.started) : (row.created ? String(row.created) : null),
    ended: row.ended ? String(row.ended) : null,
    executionTraceId: String(row.executionTraceId ?? ''),
    // Both field names for FlowMap compatibility
    previousTaskExecutionId: prevIds.length > 0 ? prevIds : null,
    previousTaskExecutionName: prevIds.length > 0 ? prevIds[0] : null,
  };
}
