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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/service';

const router = useRouter();
const tasks = ref<any[]>([]);
const hasMoreData = ref(false);
const loadingMoreData = ref(false);
const currentPage = ref(1);
const pageSize = 50;

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

const fetchTasksTask = Cadenza.createTask('Fetch Active Tasks', async (context) => {
  currentPage.value = 1;
  try {
    const data: any = await $fetch(`/api/activity/tasks/activeTasks?page=1&limit=${pageSize}`);
    const incoming = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
    tasks.value = incoming.map((t: any, i: number) => ({ ...t, uuid: t.uuid || t.name || `task-1-${i}` }));
    hasMoreData.value = incoming.length === pageSize;
  } catch (e) {
    console.error(e);
    hasMoreData.value = false;
  }
  return context;
});

const loadMoreTasksTask = Cadenza.createTask('Load More Active Tasks', async (context) => {
  loadingMoreData.value = true;
  currentPage.value++;
  try {
    const data: any = await $fetch(`/api/activity/tasks/activeTasks?page=${currentPage.value}&limit=${pageSize}`);
    const incoming = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
    const normalized = incoming.map((t: any, i: number) => ({ ...t, uuid: t.uuid || t.name || `task-${currentPage.value}-${i}` }));
    tasks.value = [...tasks.value, ...normalized];
    hasMoreData.value = incoming.length === pageSize;
  } catch (e) {
    console.error(e);
    hasMoreData.value = false;
  } finally {
    loadingMoreData.value = false;
  }
  return context;
});

async function loadMoreTasks() {
  Cadenza.run(loadMoreTasksTask, {});
}

onMounted(() => {
  const appStore = useAppStore();
  appStore.setCurrentSection('serviceActivity');
  Cadenza.run(Cadenza.createRoutine('Init Task Executions', [fetchTasksTask], ''), {});
});
</script>
