import { useCadenzaRuntime as useNuxtCadenzaRuntime } from '@cadenza.io/service/nuxt';
import type { CadenzaUIRuntime } from '../lib/cadenza/runtime';

export function useCadenzaRuntime() {
  return useNuxtCadenzaRuntime<CadenzaUIRuntime>();
}
