<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Signal Emissions</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="signals"
          row-key="uuid"
          @inspect-row="inspectSignal"
          @inspect-row-in-new-tab="inspectInNewTab"
          :enableInfiniteScroll="false"
          :hasMoreData="false"
          :loadingMoreData="loading"
        />
        <FrequencyPieChart v-if="signals.length > 0" :values="signals" />
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
const signals = ref<any[]>([]);
const loading = ref(false);

const columns = [
  { name: 'name',    label: 'Signal',  field: 'name',    align: 'left' as const, sortable: true },
  { name: 'service', label: 'Service', field: 'service', align: 'left' as const, sortable: true },
];

function inspectSignal(s: any) {
  router.push(`/activity/signals/${s.uuid}`);
}
function inspectInNewTab(s: any) {
  window.open(`/activity/signals/${s.uuid}`, '_blank');
}

const fetchSignalsTask = Cadenza.createTask('Fetch Active Signals', async (context) => {
  loading.value = true;
  try {
    const data: any = await $fetch('/api/activity/signals/activeSignals');
    signals.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
  return context;
});

onMounted(() => {
  const appStore = useAppStore();
  appStore.setCurrentSection('serviceActivity');
  Cadenza.run(Cadenza.createRoutine('Init Signal Emissions', [fetchSignalsTask], ''), {});
});
</script>
