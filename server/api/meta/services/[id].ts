import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const [serviceRows, taskRows, routineRows] = await Promise.all([
    delegateQuery<Record<string, unknown>>(address, port, 'Query service', {
      filter: { name: id, is_meta: true },
      limit: 1,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query task', {
      filter: { service_name: id, is_meta: true },
      sort: { name: 'asc' },
      limit: 200,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query routine', {
      filter: { service_name: id, is_meta: true },
      sort: { name: 'asc' },
      limit: 200,
    }),
  ]);

  if (!serviceRows.length) throw createError({ statusCode: 404, message: 'Not found' });
  const svc = serviceRows[0];

  return {
    name: String(svc.name ?? ''),
    description: String(svc.description ?? ''),
    isMeta: Boolean(svc.isMeta),
    tasks: taskRows.filter((r) => Boolean(r.isMeta)).map((r) => ({
      name: String(r.name ?? ''),
      description: String(r.description ?? ''),
      layerIndex: r.layerIndex != null ? Number(r.layerIndex) : 0,
    })),
    routines: routineRows.filter((r) => Boolean(r.isMeta)).map((r) => ({
      name: String(r.name ?? ''),
      description: String(r.description ?? ''),
    })),
  };
});
