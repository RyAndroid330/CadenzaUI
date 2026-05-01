<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Signals (Meta)</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="signals"
          row-key="name"
          @inspect-row="inspectSignal"
          @inspect-row-in-new-tab="inspectInNewTab"
          :enableInfiniteScroll="true"
          :hasMoreData="hasMoreData"
          :loadingMoreData="loadingMoreData"
          @loadMoreData="loadMoreSignals"
        />
      </div>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';

const appStore = useAppStore();
const router = useRouter();
const hasMoreData = ref(false);
const loadingMoreData = ref(false);
let refreshIntervalId: number | null = null;

const columns = [
  { name: 'name',     label: 'Name',   field: 'name',     align: 'left' as const, sortable: true },
  { name: 'domain',   label: 'Domain', field: 'domain',   align: 'left' as const, sortable: true },
  { name: 'action',   label: 'Action', field: 'action',   align: 'left' as const, sortable: true },
  { name: 'isGlobal', label: 'Global', field: 'isGlobal', align: 'left' as const, sortable: true },
];

function inspectSignal(s: any) {
  router.push(`/meta/signals/${encodeURIComponent(s.name)}`);
}
function inspectInNewTab(s: any) {
  window.open(`/meta/signals/${encodeURIComponent(s.name)}`, '_blank');
}

appStore.setCurrentSection('meta');

const {
  data,
  refresh,
} = await useAsyncData('meta-signals', async () => {
  const response: any = await $fetch('/api/meta/signals');
  hasMoreData.value = false;
  return Array.isArray(response?.signals) ? response.signals : [];
});

const signals = computed(() => data.value ?? []);

const projectionState = useCadenzaProjectionState();
const runtimeReady = useCadenzaRuntimeReady();

watch(
  runtimeReady,
  (isReady) => {
    if (refreshIntervalId !== null) {
      window.clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
    if (!isReady || !import.meta.client) {
      return;
    }
    refreshIntervalId = window.setInterval(() => {
      refresh();
    }, 10000);
  },
  { immediate: true },
);

watch(
  () => projectionState.value.projectionState.activityVersion,
  (_value, previousValue) => {
    if (previousValue !== undefined) {
      refresh();
    }
  },
);

onBeforeUnmount(() => {
  if (refreshIntervalId !== null) {
    window.clearInterval(refreshIntervalId);
  }
});

function loadMoreSignals() {}
</script>
