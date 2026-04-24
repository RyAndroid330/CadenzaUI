<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>
        {{ data?.name || String(route.params.id) }}
        {{ data?.version ? ` (v${data.version})` : '' }}
      </template>

      <div class="row q-mx-md">
        <FlowMap
          v-if="taskChain.length > 0"
          :items="taskChain"
          id-field="name"
          label-field="label"
          previous-field="previousTaskExecutionName"
          @item-selected="onTaskSelected"
        />
        <InfoCard v-if="data">
          <template #title>{{ data.name }}</template>
          <template #info>
            <div class="flex-column full-width">
              <div class="q-mx-md q-my-sm">Description: {{ data.description || 'N/A' }}</div>
              <div class="q-separator" style="height: 2px"></div>
              <div
                class="q-mx-md q-my-sm cursor-pointer text-primary"
                @click="router.push(`/meta/services/${data.service}`)"
              >Service: <span>{{ data.service }}</span></div>
              <div class="q-mx-md q-my-sm">Version: {{ data.version || 'N/A' }}</div>
              <div class="q-mx-md q-my-sm">Layer Index: {{ data.layerIndex }}</div>
              <div class="q-mx-md q-my-sm">Is Unique: {{ data.isUnique ? 'Yes' : 'No' }}</div>
              <div class="q-mx-md q-my-sm">Concurrency: {{ data.concurrency }}</div>
            </div>
          </template>
        </InfoCard>
        <InfoCard v-if="data?.functionString">
          <template #title>Task Function</template>
          <template #info>
            <pre style="max-height: 200px; overflow: auto; font-size: 12px; white-space: pre-wrap;">{{ data.functionString }}</pre>
          </template>
        </InfoCard>
        <ExecutionStatisticsPieChart type="task" :taskName="String(route.params.id)" />
        <Table
          :columns="execColumns"
          :rows="executions"
          row-key="uuid"
          inspect-base-path="/activity/tasks"
          :has-more-data="hasMoreExecs"
          :loadingMoreData="loadingMoreExecs"
          @loadMoreData="loadMoreExecutions"
          :enableInfiniteScroll="true"
        >
          <template #title>Active Executions</template>
        </Table>
        <Table
          :columns="routineColumns"
          :rows="routines"
          row-key="name"
          inspect-base-path="/meta/routines"
          :has-more-data="false"
        >
          <template #title>Routines Using This Task</template>
        </Table>
      </div>
      <HeatMap
        v-if="heatmapRawData.length > 0"
        :loading="heatmapLoading"
        :hasData="heatmapRawData.length > 0"
        :chartSeries="[]"
        :yearOptions="heatmapYearOptions"
        :monthNames="MONTH_NAMES"
        :editableRanges="heatmapRanges"
        :rawHeatmapData="heatmapRawData"
        @update:editableRanges="(v) => heatmapRanges = v"
      />
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/service';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const data = ref<any>(null);
const taskChain = ref<any[]>([]);
const executions = ref<any[]>([]);
const routines = ref<any[]>([]);
const heatmapRawData = ref<any[]>([]);
const heatmapYearOptions = ref<number[]>([new Date().getFullYear()]);
const heatmapRanges = ref([{ from: 1, to: 10 }, { from: 11, to: 50 }, { from: 51, to: 100 }, { from: 101, to: 99999 }]);
const heatmapLoading = ref(false);
const hasMoreExecs = ref(false);
const loadingMoreExecs = ref(false);
const execPage = ref(1);
const PAGE_SIZE = 50;

const execColumns = [
  { name: 'uuid',       label: 'ID',       field: 'uuid',       align: 'left' as const },
  { name: 'isRunning',  label: 'Running',  field: 'isRunning',  align: 'left' as const, sortable: true },
  { name: 'isComplete', label: 'Complete', field: 'isComplete', align: 'left' as const, sortable: true },
  { name: 'errored',    label: 'Errored',  field: 'errored',    align: 'left' as const, sortable: true },
  { name: 'progress',   label: 'Progress', field: 'progress',   align: 'left' as const },
  { name: 'started',    label: 'Started',  field: 'started',    align: 'left' as const, sortable: true },
];

const routineColumns = [
  { name: 'name',    label: 'Routine', field: 'name',    align: 'left' as const, sortable: true },
  { name: 'service', label: 'Service', field: 'service', align: 'left' as const, sortable: true },
];

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

function enrichChainWithSignals(chain: any[], taskSignalEdges: any[], signalToTaskEdges: any[]) {
  const taskNames = new Set(chain.map((t) => t.name));
  const emitEdges = taskSignalEdges.filter((e) => taskNames.has(e.taskName));
  const triggerEdges = signalToTaskEdges.filter((e) => taskNames.has(e.taskName));
  const involvedSignals = new Map<string, { emitters: string[] }>();
  for (const e of emitEdges) {
    const s = involvedSignals.get(e.signalName) ?? { emitters: [] };
    if (!s.emitters.includes(e.taskName)) s.emitters.push(e.taskName);
    involvedSignals.set(e.signalName, s);
  }
  for (const e of triggerEdges) {
    if (!involvedSignals.has(e.signalName)) involvedSignals.set(e.signalName, { emitters: [] });
  }
  const enriched = chain.map((task) => {
    const trigSigs = triggerEdges.filter((e) => e.taskName === task.name).map((e) => `signal:${e.signalName}`);
    if (trigSigs.length && !task.previousTaskExecutionName) {
      return { ...task, previousTaskExecutionName: trigSigs.length === 1 ? trigSigs[0] : trigSigs };
    }
    return task;
  });
  for (const [sigName, { emitters }] of involvedSignals) {
    const prev = emitters.length === 1 ? emitters[0] : emitters.length > 1 ? emitters : null;
    enriched.push({ name: `signal:${sigName}`, label: sigName, description: '', signal: true, previousTaskExecutionName: prev });
  }
  return enriched;
}

const fetchAllTask = Cadenza.createTask('Fetch Meta Task Detail', async (context) => {
  const id = getId();
  heatmapLoading.value = true;
  execPage.value = 1;
  const [defData, chainData, execData, routineData, heatmapData, graphData] = await Promise.allSettled([
    $fetch<any>(`/api/meta/tasks/${encodeURIComponent(id)}`),
    $fetch<any>(`/api/meta/tasks/chain?taskName=${encodeURIComponent(id)}`),
    $fetch<any>(`/api/activity/tasks/executions?taskName=${encodeURIComponent(id)}&limit=${PAGE_SIZE}`),
    $fetch<any>(`/api/meta/tasks/usedByRoutines?taskName=${encodeURIComponent(id)}`),
    $fetch<any>(`/api/heatmap/tasks?taskName=${encodeURIComponent(id)}`),
    $fetch<any>('/api/meta/graph'),
  ]);

  if (defData.status === 'fulfilled') data.value = defData.value;
  if (chainData.status === 'fulfilled') {
    const chain = chainData.value?.chain ?? [];
    const tse = graphData.status === 'fulfilled' ? (graphData.value?.taskSignalEdges ?? []) : [];
    const ste = graphData.status === 'fulfilled' ? (graphData.value?.signalToTaskEdges ?? []) : [];
    taskChain.value = enrichChainWithSignals(chain, tse, ste);
  }
  if (execData.status === 'fulfilled') {
    const list = execData.value?.executions ?? [];
    executions.value = list;
    hasMoreExecs.value = list.length === PAGE_SIZE;
  }
  if (routineData.status === 'fulfilled') routines.value = routineData.value?.routines ?? [];
  if (heatmapData.status === 'fulfilled') {
    const raw = heatmapData.value?.data ?? [];
    heatmapRawData.value = raw;
    const years = new Set<number>();
    for (const r of raw) { const y = new Date(r.date).getFullYear(); if (!isNaN(y)) years.add(y); }
    heatmapYearOptions.value = years.size ? [...years].sort((a, b) => b - a) : [new Date().getFullYear()];
  }
  heatmapLoading.value = false;
  return context;
});

async function loadMoreExecutions() {
  loadingMoreExecs.value = true;
  execPage.value++;
  const id = getId();
  try {
    const d: any = await $fetch(`/api/activity/tasks/executions?taskName=${encodeURIComponent(id)}&limit=${PAGE_SIZE}`);
    const list = d?.executions ?? [];
    executions.value = [...executions.value, ...list];
    hasMoreExecs.value = list.length === PAGE_SIZE;
  } finally {
    loadingMoreExecs.value = false;
  }
}

function onTaskSelected(task: any) {
  if (!task) return;
  if (task.signal || String(task.name ?? '').startsWith('signal:')) {
    const name = String(task.name ?? '').replace(/^signal:/, '') || String(task.label ?? '');
    if (name) router.push(`/meta/signals/${encodeURIComponent(name)}`);
  } else if (task.name) {
    router.push(`/meta/tasks/${encodeURIComponent(String(task.name))}`);
  }
}

onMounted(() => {
  appStore.setCurrentSection('meta');
  Cadenza.run(Cadenza.createRoutine('Load Meta Task', [fetchAllTask], ''), {});
});
</script>
