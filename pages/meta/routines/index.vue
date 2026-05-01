<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Routines (Meta)</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="routines"
          row-key="name"
          @inspect-row="inspectRoutine"
          @inspect-row-in-new-tab="inspectInNewTab"
          :enableInfiniteScroll="true"
          :hasMoreData="hasMoreData"
          :loadingMoreData="loadingMoreData"
          @loadMoreData="loadMoreRoutines"
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
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
  { name: 'service',     label: 'Service',     field: 'service',     align: 'left' as const, sortable: true },
  { name: 'version',     label: 'Version',     field: 'version',     align: 'left' as const, sortable: true },
];

function inspectRoutine(r: any) {
  router.push(`/meta/routines/${encodeURIComponent(r.name)}`);
}
function inspectInNewTab(r: any) {
  window.open(`/meta/routines/${encodeURIComponent(r.name)}`, '_blank');
}

appStore.setCurrentSection('meta');

const {
  data,
  refresh,
} = await useAsyncData('meta-routines', async () => {
  const response: any = await $fetch('/api/meta/routines');
  hasMoreData.value = false;
  return Array.isArray(response?.routines) ? response.routines : [];
});

const routines = computed(() => data.value ?? []);

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

function loadMoreRoutines() {}
</script>
