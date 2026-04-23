<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Routines</template>
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/core';

const router = useRouter();
const routines = ref<any[]>([]);
const hasMoreData = ref(false);
const loadingMoreData = ref(false);

const columns = [
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'version',     label: 'Version',     field: 'version',     align: 'left' as const, sortable: true },
  { name: 'service',     label: 'Service',     field: 'service',     align: 'left' as const, sortable: true },
];

function inspectRoutine(r: any) {
  router.push(`/system/routines/${encodeURIComponent(r.name)}`);
}
function inspectInNewTab(r: any) {
  window.open(`/system/routines/${encodeURIComponent(r.name)}`, '_blank');
}

const fetchRoutinesTask = Cadenza.createTask('Fetch System Routines', async (context) => {
  try {
    const data: any = await $fetch('/api/system/routines');
    routines.value = Array.isArray(data?.routines) ? data.routines : [];
    hasMoreData.value = false;
  } catch (e) {
    console.error(e);
  }
  return context;
});

function loadMoreRoutines() {}

onMounted(() => {
  const appStore = useAppStore();
  appStore.setCurrentSection('system');
  Cadenza.run(Cadenza.createRoutine('Init System Routines', [fetchRoutinesTask], ''), {});
});
</script>
