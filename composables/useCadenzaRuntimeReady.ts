export function useCadenzaRuntimeReady() {
  const state = useCadenzaProjectionState();
  return computed(() => state.value.ready);
}
