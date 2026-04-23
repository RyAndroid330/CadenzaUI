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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/core';

const router = useRouter();
const services = ref<any[]>([]);
const hasMoreData = ref(false);
const loadingMoreData = ref(false);

const columns = [
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
];

function inspectService(s: any) {
  router.push(`/system/services/${encodeURIComponent(s.name)}`);
}
function inspectInNewTab(s: any) {
  window.open(`/system/services/${encodeURIComponent(s.name)}`, '_blank');
}

const fetchServicesTask = Cadenza.createTask('Fetch System Services', async (context) => {
  try {
    const data: any = await $fetch('/api/system/services');
    services.value = Array.isArray(data?.services) ? data.services : [];
    hasMoreData.value = false;
  } catch (e) {
    console.error(e);
  }
  return context;
});

function loadMoreServices() {}

onMounted(() => {
  const appStore = useAppStore();
  appStore.setCurrentSection('system');
  Cadenza.run(Cadenza.createRoutine('Init System Services', [fetchServicesTask], ''), {});
});
</script>
