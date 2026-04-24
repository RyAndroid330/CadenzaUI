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
import Cadenza from '@cadenza.io/service';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const loading = ref(true);
const data = ref<any>(null);
const graphEdges = ref<any[]>([]);
const taskSignalEdges = ref<any[]>([]);
const signalToTaskEdges = ref<any[]>([]);

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
  if (!data.value?.tasks) return [];
  const taskNames = new Set(data.value.tasks.map((t: any) => String(t.name)));

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

  for (const task of data.value.tasks) {
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

  for (const [sigName] of involvedSignals) {
    const sigId = `signal:${sigName}`;
    const prevEmitters = emitEdges.filter((e) => e.signalName === sigName).map((e) => e.taskName);
    const prev = prevEmitters.length ? prevEmitters : null;
    items.push({
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

function onItemSelected(item: any) {
  if (!item) return;
  if (item.signal || item.nodeType === 'signal') {
    const name = String(item.name ?? '').replace(/^signal:/, '');
    if (name) router.push(`/meta/signals/${encodeURIComponent(name)}`);
  } else {
    const name = item.name || item.id || '';
    if (name) router.push(`/meta/tasks/${encodeURIComponent(name)}`);
  }
}

const fetchTask = Cadenza.createTask('Fetch Meta Service Definition', async (context) => {
  const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const [serviceResult, graphResult] = await Promise.allSettled([
    $fetch(`/api/meta/services/${encodeURIComponent(id)}`),
    $fetch('/api/meta/graph'),
  ]);
  if (serviceResult.status === 'fulfilled') data.value = serviceResult.value;
  if (graphResult.status === 'fulfilled') {
    const g = graphResult.value as any;
    graphEdges.value = g?.graph ?? [];
    taskSignalEdges.value = g?.taskSignalEdges ?? [];
    signalToTaskEdges.value = g?.signalToTaskEdges ?? [];
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
