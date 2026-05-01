<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Tasks</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="tasks"
          row-key="name"
          @inspect-row="inspectTask"
          @inspect-row-in-new-tab="inspectInNewTab"
          :enableInfiniteScroll="true"
          :hasMoreData="hasMoreData"
          :loadingMoreData="loadingMoreData"
          @loadMoreData="loadMoreTasks"
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
  { name: 'name',        label: 'Name',        field: 'name',      align: 'left' as const, sortable: true },
  { name: 'version',     label: 'Version',     field: 'version',   align: 'left' as const, sortable: true },
  { name: 'service',     label: 'Service',     field: 'service',   align: 'left' as const, sortable: true },
  { name: 'isUnique',    label: 'Unique',      field: 'isUnique',  align: 'left' as const, sortable: true },
];

function inspectTask(t: any) {
  router.push(`/system/tasks/${encodeURIComponent(t.name)}`);
}
function inspectInNewTab(t: any) {
  window.open(`/system/tasks/${encodeURIComponent(t.name)}`, '_blank');
}

appStore.setCurrentSection('system');

const {
  data,
  refresh,
} = await useAsyncData('system-tasks', async () => {
  const response: any = await $fetch('/api/system/tasks');
  hasMoreData.value = false;
  return Array.isArray(response?.tasks) ? response.tasks : [];
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

function loadMoreTasks() {}
</script>
