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
                  <div class="q-mx-md q-my-sm">Meta: {{ data.isMeta ? 'Yes' : 'No' }}</div>
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
            <ExecutionStatisticsPieChart style="flex: 1; min-width: 280px;" type="routine" :routineName="String(route.params.id)" />
          </div>

          <Table
            class="q-mt-md"
            :columns="execColumns"
            :rows="executions"
            row-key="uuid"
            inspect-base-path="/activity/routines"
            :has-more-data="false"
          >
            <template #title>Active Executions</template>
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
const heatmapRawData = ref<any[]>([]);
const heatmapYearOptions = ref<number[]>([new Date().getFullYear()]);
const heatmapRanges = ref([{ from: 1, to: 10 }, { from: 11, to: 50 }, { from: 51, to: 100 }, { from: 101, to: 99999 }]);

const execColumns = [
  { name: 'name',       label: 'Routine',  field: 'name',       align: 'left' as const, sortable: true },
  { name: 'isRunning',  label: 'Running',  field: 'isRunning',  align: 'left' as const },
  { name: 'isComplete', label: 'Complete', field: 'isComplete', align: 'left' as const },
  { name: 'errored',    label: 'Errored',  field: 'errored',    align: 'left' as const },
  { name: 'created',    label: 'Created',  field: 'created',    align: 'left' as const, sortable: true },
];

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

function onItemSelected(item: any) {
  if (!item) return;
  const name = item.name || item.id || '';
  if (name) router.push(`/meta/tasks/${encodeURIComponent(name)}`);
}

const fetchDataTask = Cadenza.createTask('Fetch Meta Routine Data', async (context) => {
  const id = getId();
  const [routineResult, chainResult, execResult, heatmapResult] = await Promise.allSettled([
    $fetch(`/api/meta/routines/${encodeURIComponent(id)}`),
    $fetch(`/api/meta/routines/taskchain?routineName=${encodeURIComponent(id)}`),
    $fetch(`/api/activity/routines/executions?routineName=${encodeURIComponent(id)}&limit=50`),
    $fetch(`/api/heatmap/routines?routineName=${encodeURIComponent(id)}`),
  ]);

  if (routineResult.status === 'fulfilled') data.value = routineResult.value;
  if (chainResult.status === 'fulfilled') {
    const c: any = chainResult.value;
    taskMap.value = (c?.chain ?? []).map((t: any) => ({ ...t, id: t.name }));
  }
  if (execResult.status === 'fulfilled') {
    const e: any = execResult.value;
    executions.value = e?.executions ?? e?.routines ?? [];
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
    await Cadenza.run(Cadenza.createRoutine('Load Meta Routine Detail', [fetchDataTask], ''), {});
  } finally {
    loading.value = false;
  }
});
</script>
