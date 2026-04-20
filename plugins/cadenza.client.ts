import Cadenza from '@cadenza.io/service';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const bootstrapUrl = String(config.public.cadenzaBootstrapUrl ?? '');

  if (!bootstrapUrl) {
    console.warn('[cadenza] No NUXT_PUBLIC_CADENZA_BOOTSTRAP_URL configured — runtime disabled.');
    return { provide: { cadenzaRuntime: null as any } };
  }

  const runtime = Cadenza.createBrowserRuntimeActor({
    actorName: 'CadenzaUIRuntimeActor',
    service: {
      name: 'CadenzaUI',
      description: 'CadenzaUI dashboard runtime',
      useSocket: false,
      bootstrap: { url: bootstrapUrl },
    },
    initialProjectionState: {},
  });

  return {
    provide: { cadenzaRuntime: runtime },
  };
});
