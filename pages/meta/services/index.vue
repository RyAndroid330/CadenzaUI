<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Services</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="services"
          row-key="name"
          @inspect-row="inspectService"
          @inspect-row-in-new-tab="inspectInNewTab"
          :enableInfiniteScroll="true"
          :hasMoreData="hasMoreData"
          :loadingMoreData="loadingMoreData"
          @loadMoreData="loadMoreServices"
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
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
];

function inspectService(s: any) {
  router.push(`/meta/services/${encodeURIComponent(s.name)}`);
}
function inspectInNewTab(s: any) {
  window.open(`/meta/services/${encodeURIComponent(s.name)}`, '_blank');
}

appStore.setCurrentSection('meta');

const {
  data,
  refresh,
} = await useAsyncData('meta-services', async () => {
  const response: any = await $fetch('/api/meta');
  hasMoreData.value = false;
  return Array.isArray(response?.services) ? response.services : [];
});

const services = computed(() => data.value ?? []);

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

function loadMoreServices() {}
</script>
