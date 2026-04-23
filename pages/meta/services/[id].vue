<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>{{ data?.name || String(route.params.id) }}</template>

      <q-inner-loading :showing="loading">
        <q-spinner-gears size="80px" color="primary" />
      </q-inner-loading>

      <div v-if="!loading && data" class="q-ma-md">
        <div v-if="flowItems.length > 0">
          <FlowMap
            :items="flowItems"
            id-field="name"
            label-field="label"
            previous-field="previousTaskExecutionName"
            @item-selected="onItemSelected"
          />
        </div>

        <div class="row" style="gap: 24px; margin-bottom: 24px;">
          <InfoCard style="flex: 1;">
            <template #title>Service Definition (Meta)</template>
            <template #info>
              <ul>
                <li>Name: {{ data.name }}</li>
                <li>Description: {{ data.description || 'N/A' }}</li>
                <li>Tasks: {{ data.tasks?.length ?? 0 }}</li>
                <li>Routines: {{ data.routines?.length ?? 0 }}</li>
              </ul>
            </template>
          </InfoCard>
        </div>
        <div class="row" style="gap: 24px;">
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 8px;">Tasks</div>
            <Table
              :columns="taskColumns"
              :rows="data.tasks ?? []"
              row-key="name"
              inspect-base-path="/meta/tasks"
              :has-more-data="false"
            />
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 8px;">Routines</div>
            <Table
              :columns="routineColumns"
              :rows="data.routines ?? []"
              row-key="name"
              inspect-base-path="/meta/routines"
              :has-more-data="false"
            />
          </div>
        </div>
      </div>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/core';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const loading = ref(true);
const data = ref<any>(null);
const graphEdges = ref<any[]>([]);

const taskColumns = [
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const, sortable: false },
  { name: 'layerIndex',  label: 'Layer',       field: 'layerIndex',  align: 'left' as const, sortable: true },
];

const routineColumns = [
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const, sortable: false },
];

const flowItems = computed(() => {
  if (!data.value?.tasks?.length) return [];
  const taskNames = new Set(data.value.tasks.map((t: any) => t.name));
  const edges = graphEdges.value.filter((e) => taskNames.has(e.previousTaskName) && taskNames.has(e.taskName));
  return data.value.tasks.map((task: any) => {
    const prevNames = edges.filter((e) => e.taskName === task.name).map((e) => e.previousTaskName);
    return {
      name: task.name,
      label: task.name,
      description: task.description || '',
      previousTaskExecutionName: prevNames.length ? prevNames[0] : null,
    };
  });
});

function onItemSelected(item: any) {
  if (!item) return;
  const name = item.name || item.id || '';
  if (name) router.push(`/meta/tasks/${encodeURIComponent(name)}`);
}

const fetchTask = Cadenza.createTask('Fetch Meta Service Definition', async (context) => {
  const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const [serviceResult, graphResult] = await Promise.allSettled([
    $fetch(`/api/meta/services/${encodeURIComponent(id)}`),
    $fetch('/api/meta/graph'),
  ]);
  if (serviceResult.status === 'fulfilled') data.value = serviceResult.value;
  if (graphResult.status === 'fulfilled') {
    graphEdges.value = (graphResult.value as any)?.graph ?? [];
  }
  return context;
});

onMounted(async () => {
  appStore.setCurrentSection('meta');
  loading.value = true;
  try {
    await Cadenza.run(Cadenza.createRoutine('Load Meta Service', [fetchTask], ''), {});
  } finally {
    loading.value = false;
  }
});
</script>
