<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Meta</template>
      <div style="margin-bottom: 20px;">
        <ServerMap
          :nodes="mapNodes"
          :edges="mapEdges"
          :loading="mapLoading"
          @node-selected="onNodeSelected"
        />
      </div>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="services"
          row-key="name"
          inspect-base-path="/meta/services"
          :has-more-data="false"
        />
      </div>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '~/stores/app';
import { useRouter } from 'vue-router';
import Cadenza from '@cadenza.io/core';

const appStore = useAppStore();
const router = useRouter();
const mapNodes = ref<any[]>([]);
const mapEdges = ref<any[]>([]);
const mapLoading = ref(false);
const services = ref<any[]>([]);

const columns = [
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
];

const fetchServicesTask = Cadenza.createTask('Fetch Meta Services', async (context) => {
  mapLoading.value = true;
  try {
    const data: any = await $fetch('/api/meta?limit=200');
    const list: any[] = Array.isArray(data?.services) ? data.services : [];
    services.value = list;
    mapNodes.value = list.map((svc) => ({
      id: svc.name,
      position: { x: 0, y: 0 },
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { label: svc.name, description: svc.description || '' },
      type: 'customNode',
    }));
    mapEdges.value = [];
  } catch (e) {
    console.error('Error fetching meta services:', e);
  } finally {
    mapLoading.value = false;
  }
  return context;
});

const onNodeSelected = (nodeId: string) => {
  router.push(`/meta/services/${encodeURIComponent(nodeId)}`);
};

onMounted(() => {
  appStore.setCurrentSection('meta');
  Cadenza.run(Cadenza.createRoutine('Load Meta', [fetchServicesTask], ''), {});
});
</script>
