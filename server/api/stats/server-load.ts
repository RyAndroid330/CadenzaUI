import { useRuntimeConfig } from '#imports';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const [instanceRows, snapshotRows] = await Promise.all([
    delegateQuery<Record<string, unknown>>(address, port, 'Query service_instance', {
      filter: { deleted: false },
      limit: 200,
    }),
    delegateQuery<Record<string, unknown>>(address, port, 'Query service_instance_health_snapshot', {
      sort: { snapshot_time: 'desc' },
      limit: 500,
    }),
  ]);

  const activeIds = new Set(
    instanceRows.filter((r) => Boolean(r.isActive)).map((r) => String(r.uuid ?? ''))
  );

  // Keep only the latest snapshot per instance
  const latestByInstance = new Map<string, Record<string, unknown>>();
  for (const snap of snapshotRows) {
    const id = String(snap.serviceInstanceId ?? '');
    if (!latestByInstance.has(id)) latestByInstance.set(id, snap);
  }

  const activeSnapshots = [...latestByInstance.entries()]
    .filter(([id]) => activeIds.has(id))
    .map(([, snap]) => snap);

  const n = activeSnapshots.length;
  if (n === 0) {
    return { cpu: 0, gpu: 0, ram: 0, latency: 0, instanceCount: 0 };
  }

  const cpu = activeSnapshots.reduce((s, r) => s + Number(r.cpu ?? 0), 0) / n;
  const gpu = activeSnapshots.reduce((s, r) => s + Number(r.gpu ?? 0), 0) / n;
  const ramMb = activeSnapshots.reduce((s, r) => s + Number(r.memory ?? 0), 0) / 1024 / 1024;
  const latency = activeSnapshots.reduce((s, r) => s + Number(r.latency ?? 0), 0) / n;

  return { cpu, gpu, ram: ramMb, latency, instanceCount: n };
});

