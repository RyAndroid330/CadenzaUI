<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Signals (Meta)</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="signals"
          row-key="name"
          @inspect-row="inspectSignal"
          @inspect-row-in-new-tab="inspectInNewTab"
          :enableInfiniteScroll="true"
          :hasMoreData="hasMoreData"
          :loadingMoreData="loadingMoreData"
          @loadMoreData="loadMoreSignals"
        />
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
const signals = ref<any[]>([]);
const hasMoreData = ref(false);
const loadingMoreData = ref(false);

const columns = [
  { name: 'name',     label: 'Name',   field: 'name',     align: 'left' as const, sortable: true },
  { name: 'domain',   label: 'Domain', field: 'domain',   align: 'left' as const, sortable: true },
  { name: 'action',   label: 'Action', field: 'action',   align: 'left' as const, sortable: true },
  { name: 'isGlobal', label: 'Global', field: 'isGlobal', align: 'left' as const, sortable: true },
];

function inspectSignal(s: any) {
  router.push(`/meta/signals/${encodeURIComponent(s.name)}`);
}
function inspectInNewTab(s: any) {
  window.open(`/meta/signals/${encodeURIComponent(s.name)}`, '_blank');
}

const fetchSignalsTask = Cadenza.createTask('Fetch Meta Signals', async (context) => {
  try {
    const data: any = await $fetch('/api/meta/signals');
    signals.value = Array.isArray(data?.signals) ? data.signals : [];
    hasMoreData.value = false;
  } catch (e) {
    console.error(e);
  }
  return context;
});

function loadMoreSignals() {}

onMounted(() => {
  const appStore = useAppStore();
  appStore.setCurrentSection('meta');
  Cadenza.run(Cadenza.createRoutine('Init Meta Signals', [fetchSignalsTask], ''), {});
});
</script>
