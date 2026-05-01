import { defineNuxtPlugin, useRuntimeConfig, useState } from 'nuxt/app';
import Cadenza from '@cadenza.io/service';
import type {
  CadenzaUIProjectionState,
  CadenzaUIRuntimeState,
} from '../lib/cadenza/runtime';
import { createCadenzaUISignalBindings } from '../lib/cadenza/runtime';

const PROJECTION_STATE_KEY = '__cadenza_runtime_projection_state__';
const HYDRATION_STATE_KEY = 'cadenza-ui-hydration';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const bootstrapUrl = String(config.public.cadenzaBootstrapUrl ?? '');

  const hydration = useState<{ initialInquiryResults: Record<string, unknown> }>(
    HYDRATION_STATE_KEY,
    () => ({ initialInquiryResults: {} }),
  );

  const projectionState = useState<CadenzaUIRuntimeState>(
    PROJECTION_STATE_KEY,
    () => ({
      ready: false,
      projectionState: {
        activityVersion: 0,
        lastSignalName: null,
        liveFeed: [],
      } as CadenzaUIProjectionState,
    }),
  );

  const runtime = Cadenza.createBrowserRuntimeActor({
    actorName: 'CadenzaUIRuntimeActor',
    service: {
      name: 'CadenzaUI',
      description: 'CadenzaUI dashboard runtime',
      useSocket: true,
      bootstrap: { url: bootstrapUrl },
      cadenzaDB: { connect: true },
      hydration: hydration.value,
    },
    initialProjectionState: {
      activityVersion: 0,
      lastSignalName: null as string | null,
      liveFeed: [] as CadenzaUIProjectionState['liveFeed'],
    },
    signalBindings: createCadenzaUISignalBindings(),
  });

  runtime.subscribe((state) => {
    projectionState.value = {
      ready: state.ready ?? false,
      projectionState: state.projectionState ?? {
        activityVersion: 0,
        lastSignalName: null,
        liveFeed: [],
      },
    };
  });

  return {
    provide: {
      cadenzaRuntime: {
        actorHandle: runtime,
        waitUntilReady: (...args: Parameters<typeof runtime.waitUntilReady>) =>
          runtime.waitUntilReady(...args),
        inquire: (...args: Parameters<typeof runtime.inquire>) =>
          runtime.inquire(...args),
        getRuntimeState: () => runtime.getRuntimeState(),
        subscribe: (...args: Parameters<typeof runtime.subscribe>) =>
          runtime.subscribe(...args),
        commands: {},
      },
    },
  };
});
