<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>{{ serverData?.service || String(route.params.id) }}</template>

      <q-inner-loading :showing="pageLoading">
        <q-spinner-gears size="80px" color="primary" />
      </q-inner-loading>

      <div v-if="!pageLoading" class="row q-ma-md" style="gap: 24px;">
        <div class="col" style="flex: 1 1 65%;">
          <div class="column" style="gap: 24px;">
            <ServiceTimeChart :series="timeChartSeries" style="width: 100%;" />
            <HeatMap
              :loading="heatmapLoading"
              :hasData="heatmapRawData.length > 0"
              :chartSeries="[]"
              :yearOptions="heatmapYearOptions"
              :monthNames="MONTH_NAMES"
              :editableRanges="heatmapRanges"
              :rawHeatmapData="heatmapRawData"
              @update:editableRanges="(v) => heatmapRanges = v"
            />
          </div>
        </div>
        <div class="col" style="flex: 0 0 30%; max-width: 360px;">
          <div class="column" style="gap: 24px;">
            <InfoCard>
              <template #title>Service Status</template>
              <template #info>
                <ul>
                  <li>Service: {{ serverData?.service || 'N/A' }}</li>
                  <li>Address: {{ serverData?.address || 'N/A' }}</li>
                  <li>Port: {{ serverData?.port ?? 'N/A' }}</li>
                  <li>Status: {{ serverData?.isActive ? 'Active' : 'Inactive' }}</li>
                  <li>Primary: {{ serverData?.isPrimary ? 'Yes' : 'No' }}</li>
                  <li>UUID: {{ serverData?.uuid || 'N/A' }}</li>
                  <li>Created: {{ serverData?.created ? formatDate(serverData.created) : 'N/A' }}</li>
                </ul>
              </template>
            </InfoCard>
            <ServiceLog :serviceInstanceId="serviceInstanceId" />
          </div>
        </div>
      </div>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/service';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const route = useRoute();
const appStore = useAppStore();
const pageLoading = ref(true);
const serverData = ref<any>(null);
const serviceInstanceId = ref<string>('');
const timeChartSeries = ref<any[]>([]);
const heatmapRawData = ref<any[]>([]);
const heatmapYearOptions = ref<number[]>([new Date().getFullYear()]);
const heatmapRanges = ref([{ from: 1, to: 10 }, { from: 11, to: 50 }, { from: 51, to: 100 }, { from: 101, to: 99999 }]);
const heatmapLoading = ref(false);

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.toDateString()} ${dt.toLocaleTimeString()}`;
}

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

const fetchServerTask = Cadenza.createTask('Fetch Service Instance Detail', async (context) => {
  const id = getId();
  serviceInstanceId.value = id;
  try {
    serverData.value = await $fetch(`/api/activity/servers/${id}`);
  } catch (e) { console.error(e); }
  return context;
});

const fetchStatsTask = Cadenza.createTask('Fetch Service Statistics', async (context) => {
  const id = getId();
  try {
    const data: any = await $fetch(`/api/activity/servers/serverStatistics?serviceInstanceId=${encodeURIComponent(id)}`);
    timeChartSeries.value = data?.series ?? [];
  } catch (e) { timeChartSeries.value = []; }
  return context;
});

const fetchHeatmapTask = Cadenza.createTask('Fetch Service Instance Heatmap', async (context) => {
  const id = getId();
  heatmapLoading.value = true;
  try {
    const data: any = await $fetch(`/api/heatmap/serviceInstance?serviceInstanceId=${encodeURIComponent(id)}`);
    const raw = data?.data ?? [];
    heatmapRawData.value = raw;
    const years = new Set<number>();
    for (const r of raw) { const y = new Date(r.date).getFullYear(); if (!isNaN(y)) years.add(y); }
    heatmapYearOptions.value = years.size ? [...years].sort((a, b) => b - a) : [new Date().getFullYear()];
  } catch (e) {
    console.error(e);
  } finally {
    heatmapLoading.value = false;
  }
  return context;
});

onMounted(async () => {
  appStore.setCurrentSection('serviceActivity');
  pageLoading.value = true;
  try {
    await Cadenza.run(Cadenza.createRoutine('Load Service Instance', [fetchServerTask, fetchStatsTask, fetchHeatmapTask], ''), {});
  } finally {
    pageLoading.value = false;
  }
});
</script>
