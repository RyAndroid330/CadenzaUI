<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Tasks (Meta)</template>
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
  { name: 'name',        label: 'Name',        field: 'name',       align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
  { name: 'service',     label: 'Service',     field: 'service',    align: 'left' as const, sortable: true },
  { name: 'version',     label: 'Version',     field: 'version',    align: 'left' as const, sortable: true },
  { name: 'layerIndex',  label: 'Layer',       field: 'layerIndex', align: 'left' as const, sortable: true },
];

function inspectTask(t: any) {
  router.push(`/meta/tasks/${encodeURIComponent(t.name)}`);
}
function inspectInNewTab(t: any) {
  window.open(`/meta/tasks/${encodeURIComponent(t.name)}`, '_blank');
}

const fetchTasksTask = Cadenza.createTask('Fetch Meta Tasks', async (context) => {
  try {
    const data: any = await $fetch('/api/meta/tasks');
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
  appStore.setCurrentSection('meta');
  Cadenza.run(Cadenza.createRoutine('Init Meta Tasks', [fetchTasksTask], ''), {});
});
</script>
