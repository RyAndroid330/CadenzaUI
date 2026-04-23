<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>{{ routineData?.name || String(route.params.id) }}</template>

      <div class="row q-mx-md">
        <FlowMap
          v-if="taskChain.length > 0"
          :items="taskChain"
          id-field="name"
          label-field="label"
          previous-field="previousTaskExecutionName"
          @item-selected="onTaskSelected"
        />
        <InfoCard v-if="routineData">
          <template #title>{{ routineData.name }}</template>
          <template #info>
            <div class="flex-column full-width">
              <div class="q-mx-md q-my-sm">Description: {{ routineData.description || 'N/A' }}</div>
              <div class="q-separator" style="height: 2px"></div>
              <div
                class="q-mx-md q-my-sm cursor-pointer text-primary"
                @click="router.push(`/system/services/${routineData.service}`)"
              >Service: <span>{{ routineData.service }}</span></div>
              <div class="q-mx-md q-my-sm">Version: {{ routineData.version || 'N/A' }}</div>
            </div>
          </template>
        </InfoCard>
        <ExecutionStatisticsPieChart type="routine" :routineName="String(route.params.id)" />
        <Table
          :columns="execColumns"
          :rows="executions"
          row-key="uuid"
          inspect-base-path="/activity/routines"
          :has-more-data="hasMoreExecs"
          :loadingMoreData="loadingMoreExecs"
          @loadMoreData="loadMoreExecutions"
          :enableInfiniteScroll="true"
        >
          <template #title>Active Executions</template>
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

const routineData = ref<any>(null);
const taskChain = ref<any[]>([]);
const executions = ref<any[]>([]);
const heatmapRawData = ref<any[]>([]);
const heatmapYearOptions = ref<number[]>([new Date().getFullYear()]);
const heatmapRanges = ref([{ from: 1, to: 10 }, { from: 11, to: 50 }, { from: 51, to: 100 }, { from: 101, to: 99999 }]);
const heatmapLoading = ref(false);
const hasMoreExecs = ref(false);
const loadingMoreExecs = ref(false);
const PAGE_SIZE = 50;

const execColumns = [
  { name: 'uuid',       label: 'ID',       field: 'uuid',       align: 'left' as const },
  { name: 'service',    label: 'Service',  field: 'service',    align: 'left' as const, sortable: true },
  { name: 'isRunning',  label: 'Running',  field: 'isRunning',  align: 'left' as const, sortable: true },
  { name: 'isComplete', label: 'Complete', field: 'isComplete', align: 'left' as const, sortable: true },
  { name: 'errored',    label: 'Errored',  field: 'errored',    align: 'left' as const, sortable: true },
  { name: 'progress',   label: 'Progress', field: 'progress',   align: 'left' as const },
  { name: 'created',    label: 'Created',  field: 'created',    align: 'left' as const, sortable: true },
];

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

const fetchAllTask = Cadenza.createTask('Fetch System Routine Detail', async (context) => {
  const id = getId();
  heatmapLoading.value = true;
  const [defData, chainData, execData, heatmapData] = await Promise.allSettled([
    $fetch<any>(`/api/system/routines/${encodeURIComponent(id)}`),
    $fetch<any>(`/api/system/routines/taskchain?routineName=${encodeURIComponent(id)}`),
    $fetch<any>(`/api/activity/routines/executions?routineName=${encodeURIComponent(id)}&limit=${PAGE_SIZE}`),
    $fetch<any>(`/api/heatmap/routines?routineName=${encodeURIComponent(id)}`),
  ]);

  if (defData.status === 'fulfilled') routineData.value = defData.value;
  if (chainData.status === 'fulfilled') taskChain.value = chainData.value?.chain ?? [];
  if (execData.status === 'fulfilled') {
    const list = execData.value?.executions ?? [];
    executions.value = list;
    hasMoreExecs.value = list.length === PAGE_SIZE;
  }
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
  const id = getId();
  try {
    const data: any = await $fetch(`/api/activity/routines/executions?routineName=${encodeURIComponent(id)}&limit=${PAGE_SIZE}`);
    const list = data?.executions ?? [];
    executions.value = [...executions.value, ...list];
    hasMoreExecs.value = list.length === PAGE_SIZE;
  } finally {
    loadingMoreExecs.value = false;
  }
}

function onTaskSelected(task: any) {
  if (!task?.name) return;
  router.push(`/system/tasks/${encodeURIComponent(String(task.name))}`);
}

onMounted(() => {
  appStore.setCurrentSection('system');
  Cadenza.run(Cadenza.createRoutine('Load System Routine', [fetchAllTask], ''), {});
});
</script>
