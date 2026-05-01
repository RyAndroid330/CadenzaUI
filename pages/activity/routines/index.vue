<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Routine Executions</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="routines"
          row-key="uuid"
          @inspect-row="inspectRoutine"
          @inspect-row-in-new-tab="inspectInNewTab"
          @loadMoreData="loadMoreRoutines"
          :enableInfiniteScroll="true"
          :hasMoreData="hasMoreData"
          :loadingMoreData="loadingMoreData"
        />
        <FrequencyPieChart v-if="routines.length > 0" :values="routines" />
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
  { name: 'name',     label: 'Name',           field: 'label',    align: 'left' as const, sortable: true },
  { name: 'status',   label: 'Status',          field: 'status',   align: 'left' as const, sortable: true },
  { name: 'progress', label: 'Progress',        field: 'progress', align: 'left' as const },
  { name: 'started',  label: 'Started',         field: 'started',  align: 'left' as const, sortable: true },
  { name: 'ended',    label: 'Ended',           field: 'ended',    align: 'left' as const, sortable: true },
  { name: 'duration', label: 'Duration (sec)',  field: 'duration', align: 'left' as const, sortable: true },
];

function inspectRoutine(r: any) {
  router.push(`/activity/routines/${r.uuid}`);
}
function inspectInNewTab(r: any) {
  window.open(`/activity/routines/${r.uuid}`, '_blank');
}

function normalizeRoutines(data: any) {
  const incoming = Array.isArray(data) ? data : [];
  hasMoreData.value = incoming.length === pageSize;
  return incoming;
}

appStore.setCurrentSection('serviceActivity');

const {
  data,
  refresh,
} = await useAsyncData('activity-routine-executions', async () => {
  currentPage.value = 1;
  const response = await $fetch(`/api/activity/routines/activeRoutines?page=1&limit=${pageSize}`);
  return normalizeRoutines(response);
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

async function loadMoreRoutines() {
  if (loadingMoreData.value) {
    return;
  }
  loadingMoreData.value = true;
  currentPage.value++;
  try {
    const response = await $fetch(`/api/activity/routines/activeRoutines?page=${currentPage.value}&limit=${pageSize}`);
    const normalized = normalizeRoutines(response);
    data.value = [...(data.value ?? []), ...normalized];
  } catch (e) {
    console.error(e);
    hasMoreData.value = false;
  } finally {
    loadingMoreData.value = false;
  }
}
</script>
