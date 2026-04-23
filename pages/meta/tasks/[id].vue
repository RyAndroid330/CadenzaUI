<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>{{ data?.name || String(route.params.id) }}</template>

      <q-inner-loading :showing="loading">
        <q-spinner-gears size="80px" color="primary" />
      </q-inner-loading>

      <div v-if="!loading">
        <div v-if="taskMap.length > 0">
          <FlowMap
            :items="taskMap"
            id-field="name"
            label-field="label"
            previous-field="previousTaskExecutionName"
            @item-selected="onItemSelected"
          />
        </div>

        <div class="q-mx-md">
          <InfoCard v-if="data" class="full-width q-mb-md">
            <template #title>{{ data.name }}</template>
            <template #info>
              <div class="row" style="flex-wrap: wrap;">
                <div class="col" style="min-width: 280px;">
                  <div class="q-mx-md q-my-sm">Description: {{ data.description || 'N/A' }}</div>
                  <div class="q-mx-md q-my-sm">Version: {{ data.version || 'N/A' }}</div>
                  <div class="q-mx-md q-my-sm">Layer Index: {{ data.layerIndex }}</div>
                  <div class="q-mx-md q-my-sm">Unique: {{ data.isUnique ? 'Yes' : 'No' }}</div>
                  <div class="q-mx-md q-my-sm">Concurrency: {{ data.concurrency }}</div>
                </div>
                <div class="col" style="min-width: 280px;">
                  <div
                    v-if="data.service"
                    class="q-mx-md q-my-sm cursor-pointer text-accent"
                    @click="router.push(`/meta/services/${data.service}`)"
                  >Service: {{ data.service }}</div>
                </div>
              </div>
            </template>
          </InfoCard>

          <div class="row" style="gap: 24px; flex-wrap: wrap;">
            <ExecutionStatisticsPieChart style="flex: 1; min-width: 280px;" type="task" :taskName="String(route.params.id)" />
          </div>

          <Table
            class="q-mt-md"
            :columns="execColumns"
            :rows="executions"
            row-key="uuid"
            inspect-base-path="/activity/tasks"
            :has-more-data="false"
          >
            <template #title>Active Executions</template>
          </Table>

          <Table
            class="q-mt-md"
            :columns="routineColumns"
            :rows="routinesUsingTask"
            row-key="name"
            inspect-base-path="/meta/routines"
            :has-more-data="false"
          >
            <template #title>Routines Using This Task</template>
          </Table>
        </div>

        <HeatMap
          v-if="heatmapRawData.length > 0"
          :loading="false"
          :hasData="true"
          :chartSeries="[]"
          :yearOptions="heatmapYearOptions"
          :monthNames="MONTH_NAMES"
          :editableRanges="heatmapRanges"
          :rawHeatmapData="heatmapRawData"
          @update:editableRanges="(v) => heatmapRanges = v"
        />
      </div>
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
const loading = ref(true);
const data = ref<any>(null);
const taskMap = ref<any[]>([]);
const executions = ref<any[]>([]);
const routinesUsingTask = ref<any[]>([]);
const heatmapRawData = ref<any[]>([]);
const heatmapYearOptions = ref<number[]>([new Date().getFullYear()]);
const heatmapRanges = ref([{ from: 1, to: 10 }, { from: 11, to: 50 }, { from: 51, to: 100 }, { from: 101, to: 99999 }]);

const execColumns = [
  { name: 'name',     label: 'Name',     field: 'name',     align: 'left' as const, sortable: true },
  { name: 'status',   label: 'Status',   field: 'status',   align: 'left' as const },
  { name: 'progress', label: 'Progress', field: 'progress', align: 'left' as const },
  { name: 'started',  label: 'Started',  field: 'started',  align: 'left' as const, sortable: true },
];

const routineColumns = [
  { name: 'name',    label: 'Routine', field: 'name',    align: 'left' as const, sortable: true },
  { name: 'service', label: 'Service', field: 'service', align: 'left' as const, sortable: true },
];

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

function onItemSelected(item: any) {
  if (!item) return;
  const name = item.name || item.id || '';
  if (name) router.push(`/meta/tasks/${encodeURIComponent(name)}`);
}

const fetchDataTask = Cadenza.createTask('Fetch Meta Task Data', async (context) => {
  const id = getId();
  const [taskResult, chainResult, execResult, routinesResult, heatmapResult] = await Promise.allSettled([
    $fetch(`/api/meta/tasks/${encodeURIComponent(id)}`),
    $fetch(`/api/meta/tasks/chain?taskName=${encodeURIComponent(id)}`),
    $fetch(`/api/activity/tasks/executions?taskName=${encodeURIComponent(id)}&limit=50`),
    $fetch(`/api/meta/tasks/usedByRoutines?taskName=${encodeURIComponent(id)}`),
    $fetch(`/api/heatmap/tasks?taskName=${encodeURIComponent(id)}`),
  ]);

  if (taskResult.status === 'fulfilled') data.value = taskResult.value;
  if (chainResult.status === 'fulfilled') {
    const c: any = chainResult.value;
    taskMap.value = (c?.chain ?? []).map((t: any) => ({ ...t, id: t.name }));
  }
  if (execResult.status === 'fulfilled') {
    const e: any = execResult.value;
    executions.value = e?.executions ?? e?.tasks ?? [];
  }
  if (routinesResult.status === 'fulfilled') {
    const r: any = routinesResult.value;
    routinesUsingTask.value = r?.routines ?? [];
  }
  if (heatmapResult.status === 'fulfilled') {
    const h: any = heatmapResult.value;
    const raw = h?.data ?? [];
    heatmapRawData.value = raw;
    const years = new Set<number>();
    for (const r of raw) { const y = new Date(r.date).getFullYear(); if (!isNaN(y)) years.add(y); }
    heatmapYearOptions.value = years.size ? [...years].sort((a, b) => b - a) : [new Date().getFullYear()];
  }
  return context;
});

onMounted(async () => {
  appStore.setCurrentSection('meta');
  loading.value = true;
  try {
    await Cadenza.run(Cadenza.createRoutine('Load Meta Task Detail', [fetchDataTask], ''), {});
  } finally {
    loading.value = false;
  }
});
</script>
