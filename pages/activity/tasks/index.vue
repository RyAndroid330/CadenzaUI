<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Task Executions</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="tasks"
          row-key="uuid"
          @inspect-row="inspectTask"
          @inspect-row-in-new-tab="inspectInNewTab"
          @loadMoreData="loadMoreTasks"
          :enableInfiniteScroll="true"
          :hasMoreData="hasMoreData"
          :loadingMoreData="loadingMoreData"
        />
        <FrequencyPieChart v-if="tasks.length > 0" :values="tasks" />
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
  { name: 'name',     label: 'Name',          field: 'name',     align: 'left' as const, sortable: true },
  { name: 'status',   label: 'Status',         field: 'status',   align: 'left' as const, sortable: true },
  { name: 'progress', label: 'Progress',       field: 'progress', align: 'left' as const },
  { name: 'started',  label: 'Started',        field: 'started',  align: 'left' as const, sortable: true },
  { name: 'ended',    label: 'Ended',          field: 'ended',    align: 'left' as const, sortable: true },
  { name: 'duration', label: 'Duration (sec)', field: 'duration', align: 'left' as const, sortable: true },
];

function inspectTask(t: any) {
  router.push(`/activity/tasks/${t.uuid}`);
}
function inspectInNewTab(t: any) {
  window.open(`/activity/tasks/${t.uuid}`, '_blank');
}

function normalizeTasks(data: any, page: number) {
  const incoming = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
  hasMoreData.value = incoming.length === pageSize;
  return incoming.map((t: any, i: number) => ({
    ...t,
    uuid: t.uuid || t.name || `task-${page}-${i}`,
  }));
}

appStore.setCurrentSection('serviceActivity');

const {
  data,
  refresh,
} = await useAsyncData('activity-task-executions', async () => {
  currentPage.value = 1;
  const response = await $fetch(`/api/activity/tasks/activeTasks?page=1&limit=${pageSize}`);
  return normalizeTasks(response, 1);
});

const tasks = computed(() => data.value ?? []);

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

async function loadMoreTasks() {
  if (loadingMoreData.value) {
    return;
  }
  loadingMoreData.value = true;
  currentPage.value++;
  try {
    const response = await $fetch(`/api/activity/tasks/activeTasks?page=${currentPage.value}&limit=${pageSize}`);
    const normalized = normalizeTasks(response, currentPage.value);
    data.value = [...(data.value ?? []), ...normalized];
  } catch (e) {
    console.error(e);
    hasMoreData.value = false;
  } finally {
    loadingMoreData.value = false;
  }
}
</script>
