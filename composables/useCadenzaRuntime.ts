import type { CadenzaUIRuntime } from '../lib/cadenza/runtime';

export function useCadenzaRuntime() {
  return useNuxtApp().$cadenzaRuntime as CadenzaUIRuntime | undefined;
}
