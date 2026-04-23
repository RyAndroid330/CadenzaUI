import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query signal_emission', {
    filter: { uuid: id },
    limit: 1,
  });

  if (!rows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const row = rows[0];

  const serviceInstanceId = String(row.serviceInstanceId ?? '');
  const taskExecutionId = String(row.taskExecutionId ?? '');
  const routineExecutionId = String(row.routineExecutionId ?? '');

  // Resolve service name and consumer tasks in parallel
  const [siRows, consumerRows] = await Promise.allSettled([
    serviceInstanceId
      ? delegateQuery<Record<string, unknown>>(address, port, 'Query service_instance', {
          filter: { uuid: serviceInstanceId },
          limit: 1,
        })
      : Promise.resolve([]),
    delegateQuery<Record<string, unknown>>(address, port, 'Query task_execution', {
      filter: { signal_emission_id: id },
      sort: { created: 'asc' },
      limit: 100,
    }),
  ]);

  const siRow = siRows.status === 'fulfilled' ? siRows.value[0] : null;
  const emitterService = siRow ? String(siRow.serviceName ?? '') : '';

  const consumers = consumerRows.status === 'fulfilled'
    ? consumerRows.value.map((r) => ({
        uuid: String(r.uuid ?? ''),
        taskName: String(r.taskName ?? ''),
        serviceName: String(r.serviceName ?? ''),
      }))
    : [];

  return {
    uuid: String(row.uuid ?? ''),
    name: String(row.signalName ?? ''),
    isMeta: Boolean(row.isMeta),
    emitterService,
    serviceInstanceId,
    routineExecutionId,
    taskExecutionId,
    consumers,
    created: String(row.created ?? ''),
  };
});
