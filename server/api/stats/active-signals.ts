import { useRuntimeConfig } from '#imports';
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

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recent = rows.filter(r => new Date(String(r.created)) > twoMinutesAgo);
  const signalNames = [...new Set(recent.map(r => String(r.signalName ?? '')).filter(Boolean))];
  return { signalNames };
});

