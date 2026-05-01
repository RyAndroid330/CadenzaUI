import { useRuntimeConfig } from '#imports';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const id = event.context.params?.id as string;
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' });

  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query service_instance_health_snapshot', {
    filter: { service_instance_id: id },
    sort: { snapshot_time: 'desc' },
    limit: 1,
  });

  if (!rows.length) return { cpu: 0, gpu: 0, ram: 0, latency: 0, hasData: false };

  const r = rows[0];
  return {
    hasData: true,
    cpu: Number(r.cpu ?? 0),
    gpu: Number(r.gpu ?? 0),
    ram: Number(r.memory ?? 0) / 1024 / 1024,
    latency: Number(r.latency ?? 0),
    snapshotTime: r.snapshotTime ? String(r.snapshotTime) : null,
    customMetrics: r.customMetrics ?? null,
  };
});

