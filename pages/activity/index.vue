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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useAppStore } from '~/stores/app';
import { useRouter } from 'vue-router';

const appStore = useAppStore();
const router = useRouter();
const mapNodes = ref<any[]>([]);
const mapEdges = ref<any[]>([]);
const mapLoading = ref(false);
let refreshIntervalId: number | null = null;

const columns = [
  { name: 'service',    label: 'Service',   field: 'service',    align: 'left' as const, sortable: true },
  { name: 'isActive',   label: 'Active',    field: 'isActive',   align: 'left' as const, sortable: true },
  { name: 'isPrimary',  label: 'Primary',   field: 'isPrimary',  align: 'left' as const, sortable: true },
  { name: 'isDatabase', label: 'Database',  field: 'isDatabase', align: 'left' as const, sortable: true },
  { name: 'isFrontend', label: 'Frontend',  field: 'isFrontend', align: 'left' as const, sortable: true },
  { name: 'isBlocked',  label: 'Blocked',   field: 'isBlocked',  align: 'left' as const, sortable: true },
  { name: 'created',    label: 'Created',   field: 'created',    align: 'left' as const, sortable: true },
];

function buildActivityState(data: any) {
  mapLoading.value = true;
  try {
    const list = data?.instances ?? [];
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
    return list;
  } catch (e) {
    console.error('Error fetching activity servers:', e);
    return [];
  } finally {
    mapLoading.value = false;
  }
}

appStore.setCurrentSection('serviceActivity');

const {
  data,
  refresh,
} = await useAsyncData('activity-servers-overview', async () => {
  const response: any = await $fetch('/api/activity/servers');
  return buildActivityState(response);
});

const instances = computed(() => data.value ?? []);

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

const onNodeSelected = (nodeId: string) => {
  const inst = instances.value.find((i) => i.uuid === nodeId);
  if (inst) router.push(`/activity/services/${inst.uuid}`);
};
</script>

<style scoped>
.activity-layout { display: flex; flex-direction: column; gap: 20px; }
</style>
