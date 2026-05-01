<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Traces</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="traces"
          row-key="uuid"
          @inspect-row="inspectTrace"
          @inspect-row-in-new-tab="inspectInNewTab"
          :enableInfiniteScroll="true"
          :hasMoreData="hasMoreData"
          :loadingMoreData="loadingMoreData"
          @loadMoreData="loadMoreTraces"
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
const currentPage = ref(1);
const pageSize = 50;
let refreshIntervalId: number | null = null;

const columns = [
  { name: 'uuid',    label: 'UUID',    field: 'uuid',    align: 'left' as const },
  { name: 'service', label: 'Service', field: 'service', align: 'left' as const, sortable: true },
  { name: 'created', label: 'Created', field: 'created', align: 'left' as const, sortable: true },
];

function inspectTrace(t: any) {
  router.push(`/activity/traces/${t.uuid}`);
}
function inspectInNewTab(t: any) {
  window.open(`/activity/traces/${t.uuid}`, '_blank');
}

function normalizeTraces(data: any) {
  const incoming = Array.isArray(data) ? data : [];
  hasMoreData.value = incoming.length === pageSize;
  return incoming;
}

appStore.setCurrentSection('serviceActivity');

const {
  data,
  refresh,
} = await useAsyncData('activity-traces', async () => {
  currentPage.value = 1;
  const response = await $fetch(`/api/activity/traces/traces?page=1&limit=${pageSize}`);
  return normalizeTraces(response);
});

const traces = computed(() => data.value ?? []);

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
      if (!loadingMoreData.value) {
        refresh();
      }
    }, 10000);
  },
  { immediate: true },
);

watch(
  () => projectionState.value.projectionState.activityVersion,
  (_value, previousValue) => {
    if (previousValue === undefined) {
      return;
    }
    if (!loadingMoreData.value) {
      refresh();
    }
  },
);

onBeforeUnmount(() => {
  if (refreshIntervalId !== null) {
    window.clearInterval(refreshIntervalId);
  }
});

async function loadMoreTraces() {
  if (loadingMoreData.value) {
    return;
  }
  loadingMoreData.value = true;
  currentPage.value++;
  try {
    const response = await $fetch(`/api/activity/traces/traces?page=${currentPage.value}&limit=${pageSize}`);
    const normalized = normalizeTraces(response);
    data.value = [...(data.value ?? []), ...normalized];
  } catch (e) {
    console.error(e);
    hasMoreData.value = false;
  } finally {
    loadingMoreData.value = false;
  }
}
</script>
