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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/core';

const router = useRouter();
const traces = ref<any[]>([]);
const hasMoreData = ref(false);
const loadingMoreData = ref(false);
const currentPage = ref(1);
const pageSize = 50;

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

const fetchTracesTask = Cadenza.createTask('Fetch Traces', async (context) => {
  currentPage.value = 1;
  try {
    const data: any = await $fetch(`/api/activity/traces/traces?page=1&limit=${pageSize}`);
    traces.value = Array.isArray(data) ? data : [];
    hasMoreData.value = traces.value.length === pageSize;
  } catch (e) {
    console.error(e);
    hasMoreData.value = false;
  }
  return context;
});

const loadMoreTracesTask = Cadenza.createTask('Load More Traces', async (context) => {
  loadingMoreData.value = true;
  currentPage.value++;
  try {
    const data: any = await $fetch(`/api/activity/traces/traces?page=${currentPage.value}&limit=${pageSize}`);
    const incoming = Array.isArray(data) ? data : [];
    traces.value = [...traces.value, ...incoming];
    hasMoreData.value = incoming.length === pageSize;
  } catch (e) {
    console.error(e);
    hasMoreData.value = false;
  } finally {
    loadingMoreData.value = false;
  }
  return context;
});

async function loadMoreTraces() {
  Cadenza.run(loadMoreTracesTask, {});
}

onMounted(() => {
  const appStore = useAppStore();
  appStore.setCurrentSection('serviceActivity');
  Cadenza.run(Cadenza.createRoutine('Init Traces', [fetchTracesTask], ''), {});
});
</script>
