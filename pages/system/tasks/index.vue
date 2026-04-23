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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/core';

const router = useRouter();
const tasks = ref<any[]>([]);
const hasMoreData = ref(false);
const loadingMoreData = ref(false);

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

const fetchTasksTask = Cadenza.createTask('Fetch System Tasks', async (context) => {
  try {
    const data: any = await $fetch('/api/system/tasks');
    tasks.value = Array.isArray(data?.tasks) ? data.tasks : [];
    hasMoreData.value = false;
  } catch (e) {
    console.error(e);
  }
  return context;
});

function loadMoreTasks() {}

onMounted(() => {
  const appStore = useAppStore();
  appStore.setCurrentSection('system');
  Cadenza.run(Cadenza.createRoutine('Init System Tasks', [fetchTasksTask], ''), {});
});
</script>
