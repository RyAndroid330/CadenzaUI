<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Activity</template>
      <div class="activity-layout">
        <ServerMap
          :nodes="mapNodes"
          :edges="mapEdges"
          :loading="mapLoading"
          @node-selected="onNodeSelected"
        />
        <Table
          :columns="columns"
          :rows="instances"
          row-key="uuid"
          inspect-base-path="/activity/services"
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
import Cadenza from '@cadenza.io/service';

const appStore = useAppStore();
const router = useRouter();
const instances = ref<any[]>([]);
const mapNodes = ref<any[]>([]);
const mapEdges = ref<any[]>([]);
const mapLoading = ref(false);

const columns = [
  { name: 'service',    label: 'Service',   field: 'service',    align: 'left' as const, sortable: true },
  { name: 'isActive',   label: 'Active',    field: 'isActive',   align: 'left' as const, sortable: true },
  { name: 'isPrimary',  label: 'Primary',   field: 'isPrimary',  align: 'left' as const, sortable: true },
  { name: 'isDatabase', label: 'Database',  field: 'isDatabase', align: 'left' as const, sortable: true },
  { name: 'isFrontend', label: 'Frontend',  field: 'isFrontend', align: 'left' as const, sortable: true },
  { name: 'isBlocked',  label: 'Blocked',   field: 'isBlocked',  align: 'left' as const, sortable: true },
  { name: 'created',    label: 'Created',   field: 'created',    align: 'left' as const, sortable: true },
];

const fetchActivityTask = Cadenza.createTask('Fetch Activity Servers', async (context) => {
  mapLoading.value = true;
  try {
    const data: any = await $fetch('/api/activity/servers');
    const list = data?.instances ?? [];
    instances.value = list;
    const seen = new Set<string>();
    const nodes: any[] = [];
    for (const inst of list) {
      if (!seen.has(inst.service)) {
        seen.add(inst.service);
        nodes.push({
          id: inst.uuid,
          position: { x: 0, y: 0 },
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { label: inst.service, description: inst.isActive ? 'Active' : 'Inactive' },
          type: 'customNode',
        });
      }
    }
    mapNodes.value = nodes;
    mapEdges.value = [];
  } catch (e) {
    console.error('Error fetching activity servers:', e);
  } finally {
    mapLoading.value = false;
  }
  return context;
});

const onNodeSelected = (nodeId: string) => {
  const inst = instances.value.find((i) => i.uuid === nodeId);
  if (inst) router.push(`/activity/services/${inst.uuid}`);
};

onMounted(() => {
  appStore.setCurrentSection('serviceActivity');
  Cadenza.run(Cadenza.createRoutine('Load Activity', [fetchActivityTask], ''), {});
});
</script>

<style scoped>
.activity-layout { display: flex; flex-direction: column; gap: 20px; }
</style>
