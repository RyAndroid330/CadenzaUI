import type { CadenzaUIProjectionState, CadenzaUIRuntimeState } from '../lib/cadenza/runtime';

// Key must match RUNTIME_PROJECTION_STATE_KEY in @cadenza.io/service/nuxt
const PROJECTION_STATE_KEY = '__cadenza_runtime_projection_state__';

export function useCadenzaProjectionState() {
  return useState<CadenzaUIRuntimeState>(PROJECTION_STATE_KEY, () => ({
    ready: false,
    projectionState: {
      activityVersion: 0,
      lastSignalName: null,
      liveFeed: [],
    } as CadenzaUIProjectionState,
  }));
}
