import { useCadenzaProjectionState as useNuxtCadenzaProjectionState } from '@cadenza.io/service/nuxt';
import type { CadenzaUIProjectionState, CadenzaUIRuntimeState } from '../lib/cadenza/runtime';

export function useCadenzaProjectionState() {
  return useNuxtCadenzaProjectionState<CadenzaUIProjectionState>() as {
    value: CadenzaUIRuntimeState;
  };
}
