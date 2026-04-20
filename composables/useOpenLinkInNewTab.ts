import { useRouter } from 'vue-router';

export function useOpenLinkInNewTab() {
  const router = process.client ? useRouter() : null;

  function openLinkInNewTab(path: string) {
    if (process.client) {
      const base = window.location.origin;
      window.open(base + path, '_blank');
    }
  }

  return { openLinkInNewTab };
}
