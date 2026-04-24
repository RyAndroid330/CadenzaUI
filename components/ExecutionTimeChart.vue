<template>
  <InfoCard>
    <template #title>Execution Times</template>
    <template #info>
      <div v-if="isLoading" class="flex column items-center justify-center full-height">
        <q-spinner-dots size="40px" color="primary" class="q-mb-md" />
        <div class="text-subtitle1">Loading execution times...</div>
      </div>
      <div v-else-if="!hasData" class="flex column items-center justify-center full-height">
        <q-icon name="bar_chart" size="48px" color="grey-5" class="q-mb-md" />
        <div class="text-subtitle1 text-grey-6 text-center">No execution data available</div>
      </div>
      <div v-else>
        <apexchart type="area" height="350" :options="chartOptions" :series="series" />
      </div>
    </template>
  </InfoCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps<{
  type?: string;
  taskName?: string;
  routineName?: string;
  serviceName?: string;
}>();

const series = ref<any[]>([]);
const isLoading = ref(false);
const hasData = computed(() => series.value.some((s) => Array.isArray(s.data) && s.data.length > 0));

const chartOptions = {
  chart: { type: 'area', height: 350, stacked: false },
  colors: ['#FF3B30', '#007AFF', '#34C759'],
  dataLabels: { enabled: false },
  stroke: { curve: 'straight' },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.8 } },
  legend: { position: 'top', horizontalAlign: 'left' },
  xaxis: { type: 'datetime', title: { text: 'Date' } },
  yaxis: {
    title: { text: 'Execution Time (seconds)' },
    labels: { formatter: (v: number) => v.toFixed(2) },
  },
};

async function fetchTimes() {
  const type = props.type ?? 'task';
  const name =
    type === 'routine' ? props.routineName :
    type === 'service' ? props.serviceName :
    props.taskName;
  if (!name) return;

  isLoading.value = true;
  try {
    const data: any = await $fetch(
      `/api/stats/execution-times?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`
    );
    series.value = data?.series ?? [];
  } catch {
    series.value = [];
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchTimes);
watch(() => [props.type, props.taskName, props.routineName, props.serviceName], fetchTimes);
</script>
