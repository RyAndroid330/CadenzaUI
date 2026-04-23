<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>
        {{ taskData?.name || String(route.params.id) }}
        {{ taskData?.version ? ` (v${taskData.version})` : '' }}
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
        <InfoCard v-if="taskData">
          <template #title>{{ taskData.name }}</template>
          <template #info>
            <div class="flex-column full-width">
              <div class="q-mx-md q-my-sm">Description: {{ taskData.description || 'N/A' }}</div>
              <div class="q-separator" style="height: 2px"></div>
              <div
                class="q-mx-md q-my-sm cursor-pointer text-primary"
                @click="router.push(`/system/services/${taskData.service}`)"
              >Service: <span>{{ taskData.service }}</span></div>
              <div class="q-mx-md q-my-sm">Version: {{ taskData.version || 'N/A' }}</div>
              <div class="q-mx-md q-my-sm">Layer Index: {{ taskData.layerIndex }}</div>
              <div class="q-mx-md q-my-sm">Is Unique: {{ taskData.isUnique ? 'Yes' : 'No' }}</div>
              <div class="q-mx-md q-my-sm">Concurrency: {{ taskData.concurrency }}</div>
            </div>
          </template>
        </InfoCard>
        <InfoCard v-if="taskData?.functionString">
          <template #title>Task Function</template>
          <template #info>
            <pre style="max-height: 200px; overflow: auto; font-size: 12px; white-space: pre-wrap;">{{ taskData.functionString }}</pre>
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
          inspect-base-path="/system/routines"
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
import Cadenza from '@cadenza.io/core';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const taskData = ref<any>(null);
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

const fetchAllTask = Cadenza.createTask('Fetch System Task Detail', async (context) => {
  const id = getId();
  heatmapLoading.value = true;
  execPage.value = 1;
  const [defData, chainData, execData, routineData, heatmapData] = await Promise.allSettled([
    $fetch<any>(`/api/system/tasks/${encodeURIComponent(id)}`),
    $fetch<any>(`/api/system/tasks/chain?taskName=${encodeURIComponent(id)}`),
    $fetch<any>(`/api/activity/tasks/executions?taskName=${encodeURIComponent(id)}&limit=${PAGE_SIZE}`),
    $fetch<any>(`/api/system/tasks/usedByRoutines?taskName=${encodeURIComponent(id)}`),
    $fetch<any>(`/api/heatmap/tasks?taskName=${encodeURIComponent(id)}`),
  ]);

  if (defData.status === 'fulfilled') taskData.value = defData.value;
  if (chainData.status === 'fulfilled') taskChain.value = chainData.value?.chain ?? [];
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
    const data: any = await $fetch(`/api/activity/tasks/executions?taskName=${encodeURIComponent(id)}&limit=${PAGE_SIZE}`);
    const list = data?.executions ?? [];
    executions.value = [...executions.value, ...list];
    hasMoreExecs.value = list.length === PAGE_SIZE;
  } finally {
    loadingMoreExecs.value = false;
  }
}

function onTaskSelected(task: any) {
  if (!task) return;
  if (task.name) router.push(`/system/tasks/${encodeURIComponent(String(task.name))}`);
}

onMounted(() => {
  appStore.setCurrentSection('system');
  Cadenza.run(Cadenza.createRoutine('Load System Task', [fetchAllTask], ''), {});
});
</script>
