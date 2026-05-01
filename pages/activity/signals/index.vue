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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';

const appStore = useAppStore();
const router = useRouter();
const loading = ref(false);
let refreshIntervalId: number | null = null;

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

appStore.setCurrentSection('serviceActivity');

const {
  data,
  refresh,
} = await useAsyncData('activity-signal-emissions', async () => {
  loading.value = true;
  try {
    const response: any = await $fetch('/api/activity/signals/activeSignals');
    return Array.isArray(response) ? response : [];
  } catch (e) {
    console.error(e);
    return [];
  } finally {
    loading.value = false;
  }
});

const signals = computed(() => data.value ?? []);

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
      if (!loading.value) {
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
    if (!loading.value) {
      refresh();
    }
  },
);

onBeforeUnmount(() => {
  if (refreshIntervalId !== null) {
    window.clearInterval(refreshIntervalId);
  }
});
</script>
