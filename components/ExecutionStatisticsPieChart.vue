<template>
  <InfoCard>
    <template #title> Execution Statistics </template>
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
        <apexchart
          type="pie"
          :options="chartOptions"
          :series="series"
          width="550"
        ></apexchart>
      </div>
    </template>
  </InfoCard>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts';
import Cadenza from '@cadenza.io/core';
import { ref } from 'vue';

const _series = ref([]);
const _hasData = ref(false);
const _isLoading = ref(false);

const fetchExecutionStatsTask = Cadenza.createTask(
  'fetchExecutionStats',
  async (context) => {
    const { type, taskName, routineId, routineName } = context;
    let url;
    if (type === 'routine') {
      const name = routineName ?? routineId;
      url = `/api/stats/executions?type=routine&name=${encodeURIComponent(name ?? '')}`;
    } else if (type === 'task') {
      url = `/api/stats/executions?type=task&name=${encodeURIComponent(taskName ?? '')}`;
    } else {
      url = `/api/stats/executions`;
    }
    try {
      const data = await $fetch(url);
      let isComplete = 0,
        errored = 0,
        failed = 0;

      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        const statsObj = data[0];
        const rawErrored = statsObj.errored ?? statsObj.erroredCount ?? 0;
        const rawFailed = statsObj.failed ?? statsObj.failedCount ?? 0;
        const rawIsComplete = statsObj.isComplete ?? statsObj.completedCount ?? null;
        const rawExecutions = statsObj.executions ?? statsObj.count ?? 0;

        errored = Number(rawErrored);
        failed = Number(rawFailed);

        if (rawIsComplete !== null && rawIsComplete !== undefined) {
          isComplete = Number(rawIsComplete || 0);
        } else {
          isComplete = Math.max(0, Number(rawExecutions) - errored - failed);
        }
      }

      _series.value = [isComplete, errored, failed];
      _hasData.value = isComplete > 0 || errored > 0 || failed > 0;
    } catch (error) {
      console.error('Error fetching execution statistics:', error);
      _series.value = [];
      _hasData.value = false;
    } finally {
      _isLoading.value = false;
    }
    return context;
  }
);

const initializeExecutionStatsRoutine = Cadenza.createRoutine(
  'Initialize Execution Statistics',
  [fetchExecutionStatsTask],
  'Fetches execution statistics for pie chart.'
);

export default {
  components: {
    apexchart: VueApexCharts,
  },
  props: {
    type: String,
    taskName: String,
    routineId: String,
    routineName: String,
    loading: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      chartOptions: {
        chart: {
          width: 380,
          type: 'pie',
        },
        labels: ['Successful', 'Errored', 'Failed'],
        colors: ['#34C759', '#FF9500', '#FF3B30'],
        responsive: [
          {
            breakpoint: 480,
            options: {
              chart: { width: 200 },
              legend: { position: 'bottom', fontSize: '16px' },
            },
          },
        ],
        legend: { fontSize: '22px' },
      },
    };
  },
  computed: {
    series() { return _series.value; },
    hasData() { return _hasData.value; },
    isLoading() { return this.loading || _isLoading.value; },
  },
  async mounted() {
    _isLoading.value = true;
    await Cadenza.run(initializeExecutionStatsRoutine, {
      type: this.type,
      taskName: this.taskName,
      routineId: this.routineId,
      routineName: this.routineName,
    });
  },
};
</script>
