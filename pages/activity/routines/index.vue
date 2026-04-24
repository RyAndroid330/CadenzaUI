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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/service';

const router = useRouter();
const routines = ref<any[]>([]);
const hasMoreData = ref(false);
const loadingMoreData = ref(false);
const currentPage = ref(1);
const pageSize = 50;

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

const loadRoutinesTask = Cadenza.createTask('Load Routine Executions', async (context) => {
  currentPage.value = 1;
  try {
    const data: any = await $fetch(`/api/activity/routines/activeRoutines?page=1&limit=${pageSize}`);
    routines.value = Array.isArray(data) ? data : [];
    hasMoreData.value = routines.value.length === pageSize;
  } catch (e) {
    console.error(e);
    hasMoreData.value = false;
  }
  return context;
});

const loadMoreRoutinesTask = Cadenza.createTask('Load More Routine Executions', async (context) => {
  loadingMoreData.value = true;
  currentPage.value++;
  try {
    const data: any = await $fetch(`/api/activity/routines/activeRoutines?page=${currentPage.value}&limit=${pageSize}`);
    const incoming = Array.isArray(data) ? data : [];
    routines.value = [...routines.value, ...incoming];
    hasMoreData.value = incoming.length === pageSize;
  } catch (e) {
    console.error(e);
    hasMoreData.value = false;
  } finally {
    loadingMoreData.value = false;
  }
  return context;
});

async function loadMoreRoutines() {
  Cadenza.run(loadMoreRoutinesTask, {});
}

onMounted(() => {
  const appStore = useAppStore();
  appStore.setCurrentSection('serviceActivity');
  Cadenza.run(Cadenza.createRoutine('Init Routine Executions', [loadRoutinesTask], ''), {});
});
</script>
