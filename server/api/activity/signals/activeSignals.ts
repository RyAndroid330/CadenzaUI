import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query signal_emission', {
    filter: { is_meta: false },
    sort: { created: 'desc' },
    limit: 200,
  });

  return rows.map((row) => ({
    uuid: String(row.uuid ?? ''),
    name: String(row.signalName ?? ''),
    service: String(row.emitterService ?? row.serviceName ?? ''),
  }));
});
