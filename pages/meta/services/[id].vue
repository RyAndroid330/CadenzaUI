<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>{{ serviceData?.name || String(route.params.id) }}</template>

      <div class="row q-mx-md">
        <div class="col-8">
          <FlowMap
            v-if="flowItems.length > 0"
            :items="flowItems"
            :full-width="true"
            id-field="name"
            label-field="label"
            previous-field="previousTaskExecutionName"
            @item-selected="onFlowItemSelected"
          />
          <div v-else-if="loading" class="text-center q-pa-md">Loading...</div>
        </div>
        <div class="col-4">
          <InfoCard v-if="serviceData">
            <template #title>{{ serviceData.name }}</template>
            <template #info>
              <div class="flex-column full-width">
                <div class="q-mx-md q-my-sm">Description: {{ serviceData.description || 'N/A' }}</div>
                <div class="q-mx-md q-my-sm">Tasks: {{ serviceData.tasks?.length ?? 0 }}</div>
                <div class="q-mx-md q-my-sm">Routines: {{ serviceData.routines?.length ?? 0 }}</div>
              </div>
            </template>
          </InfoCard>
        </div>
      </div>
      <div class="row q-mx-md">
        <ExecutionTimeChart type="service" :serviceName="String(route.params.id)" />
        <Table
          :columns="taskColumns"
          :rows="serviceData?.tasks ?? []"
          row-key="name"
          inspect-base-path="/meta/tasks"
          :has-more-data="false"
        >
          <template #title>Tasks</template>
        </Table>
        <Table
          :columns="routineColumns"
          :rows="serviceData?.routines ?? []"
          row-key="name"
          inspect-base-path="/meta/routines"
          :has-more-data="false"
        >
          <template #title>Routines</template>
        </Table>
      </div>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/service';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const loading = ref(true);
const serviceData = ref<any>(null);
const graphEdges = ref<any[]>([]);
const taskSignalEdges = ref<any[]>([]);
const signalToTaskEdges = ref<any[]>([]);

const taskColumns = [
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
  { name: 'layerIndex',  label: 'Layer',       field: 'layerIndex',  align: 'left' as const, sortable: true },
];

const routineColumns = [
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
];

const flowItems = computed(() => {
  if (!serviceData.value?.tasks) return [];
  const taskNames = new Set(serviceData.value.tasks.map((t: any) => String(t.name)));

  const taskEdges = graphEdges.value.filter(
    (e) => taskNames.has(e.previousTaskName) && taskNames.has(e.taskName)
  );

  const emitEdges = taskSignalEdges.value.filter((e) => taskNames.has(e.taskName));
  const triggerEdges = signalToTaskEdges.value.filter((e) => taskNames.has(e.taskName));

  const involvedSignals = new Map<string, { emit: boolean; trigger: boolean }>();
  for (const e of emitEdges) {
    const s = involvedSignals.get(e.signalName) ?? { emit: false, trigger: false };
    s.emit = true;
    involvedSignals.set(e.signalName, s);
  }
  for (const e of triggerEdges) {
    const s = involvedSignals.get(e.signalName) ?? { emit: false, trigger: false };
    s.trigger = true;
    involvedSignals.set(e.signalName, s);
  }

  const items: any[] = [];

  for (const task of serviceData.value.tasks) {
    const prevTasks = taskEdges.filter((e) => e.taskName === task.name).map((e) => e.previousTaskName);
    const prevSignals = triggerEdges.filter((e) => e.taskName === task.name).map((e) => `signal:${e.signalName}`);
    const allPrev = [...prevTasks, ...prevSignals];
    items.push({
      name: task.name,
      label: task.name,
      description: task.description ?? '',
      nodeType: 'task',
      previousTaskExecutionName: allPrev.length === 1 ? allPrev[0] : allPrev.length > 1 ? allPrev : null,
    });
  }

  for (const [sigName, { emit, trigger }] of involvedSignals) {
    const sigId = `signal:${sigName}`;
    const prevEmitters = emitEdges.filter((e) => e.signalName === sigName).map((e) => e.taskName);
    const prev = prevEmitters.length ? prevEmitters : null;
    items.push({
      id: sigId,
      name: sigId,
      label: sigName,
      description: '',
      signal: true,
      nodeType: 'signal',
      previousTaskExecutionName: Array.isArray(prev) && prev.length === 1 ? prev[0] : prev,
    });
  }

  return items;
});

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

const fetchAllTask = Cadenza.createTask('Fetch Meta Service Detail', async (context) => {
  const id = getId();
  const [defData, graphData] = await Promise.allSettled([
    $fetch<any>(`/api/meta/services/${encodeURIComponent(id)}`),
    $fetch<any>('/api/meta/graph'),
  ]);

  if (defData.status === 'fulfilled') serviceData.value = defData.value;
  if (graphData.status === 'fulfilled') {
    graphEdges.value = graphData.value?.graph ?? [];
    taskSignalEdges.value = graphData.value?.taskSignalEdges ?? [];
    signalToTaskEdges.value = graphData.value?.signalToTaskEdges ?? [];
  }
  return context;
});

function onFlowItemSelected(item: any) {
  if (!item) return;
  if (item.signal || item.nodeType === 'signal') {
    const name = String(item.id ?? item.name ?? '').replace(/^signal:/, '');
    if (name) router.push(`/meta/signals/${encodeURIComponent(name)}`);
  } else if (item.name) {
    router.push(`/meta/tasks/${encodeURIComponent(String(item.name))}`);
  }
}

onMounted(async () => {
  appStore.setCurrentSection('meta');
  loading.value = true;
  try {
    await Cadenza.run(Cadenza.createRoutine('Load Meta Service Detail', [fetchAllTask], ''), {});
  } finally {
    loading.value = false;
  }
});
</script>
