<template>
  <InfoCard>
    <template #title>Execution Statistics</template>
    <template #info>
      <div v-if="isLoading" class="flex column items-center justify-center full-height">
        <q-spinner-dots size="40px" color="primary" class="q-mb-md" />
        <div class="text-subtitle1">Loading execution statistics...</div>
      </div>
      <div v-else-if="!hasData" class="flex column items-center justify-center full-height">
        <q-icon name="bar_chart" size="48px" color="grey-5" class="q-mb-md" />
        <div class="text-subtitle1 text-grey-6 text-center">No execution data available</div>
      </div>
      <div v-else>
        <apexchart type="pie" :options="chartOptions" :series="series" width="550" />
      </div>
    </template>
  </InfoCard>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{
  type?: string;
  taskName?: string;
  routineName?: string;
  routineId?: string;
  signalName?: string;
}>();

const series = ref<number[]>([]);
const hasData = ref(false);
const isLoading = ref(false);

const chartOptions = {
  chart: { width: 380, type: 'pie' },
  labels: ['Successful', 'Errored', 'Failed'],
  colors: ['#34C759', '#FF9500', '#FF3B30'],
  responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { position: 'bottom', fontSize: '16px' } } }],
  legend: { fontSize: '22px' },
};

async function fetchStats() {
  let url: string;
  if (props.type === 'task' && props.taskName) {
    url = `/api/stats/executions?type=task&name=${encodeURIComponent(props.taskName)}`;
  } else if (props.type === 'routine') {
    const name = props.routineName ?? props.routineId ?? '';
    url = `/api/stats/executions?type=routine&name=${encodeURIComponent(name)}`;
  } else if (props.type === 'signal' && props.signalName) {
    url = `/api/stats/executions?type=signal&name=${encodeURIComponent(props.signalName)}`;
  } else {
    url = `/api/stats/executions`;
  }

  isLoading.value = true;
  try {
    const data: any = await $fetch(url);
    let isComplete = 0, errored = 0, failed = 0;
    if (Array.isArray(data) && data.length > 0) {
      const s = data[0];
      errored = Number(s.errored ?? s.erroredCount ?? 0);
      failed = Number(s.failed ?? s.failedCount ?? 0);
      const rawComplete = s.isComplete ?? s.completedCount ?? null;
      isComplete = rawComplete !== null
        ? Number(rawComplete)
        : Math.max(0, Number(s.executions ?? s.count ?? 0) - errored - failed);
    }
    series.value = [isComplete, errored, failed];
    hasData.value = isComplete > 0 || errored > 0 || failed > 0;
  } catch (e) {
    console.error('ExecutionStatisticsPieChart fetch error:', e);
    series.value = [];
    hasData.value = false;
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchStats);
watch(() => [props.type, props.taskName, props.routineName, props.routineId, props.signalName], fetchStats);
</script>
