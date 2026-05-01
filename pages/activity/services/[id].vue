<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>{{ serverData?.service || String(route.params.id) }}</template>

      <q-inner-loading :showing="pageLoading">
        <q-spinner-gears size="80px" color="primary" />
      </q-inner-loading>

      <div v-if="!pageLoading" class="service-page-grid q-px-md q-pb-md">
        <div class="service-page-left" ref="leftColRef">
          <ServiceTimeChart :series="timeChartSeries" />
          <HeatMap
            class="service-heatmap"
            :loading="heatmapLoading"
            :hasData="heatmapRawData.length > 0"
            :chartSeries="[]"
            :yearOptions="heatmapYearOptions"
            :monthNames="MONTH_NAMES"
            :editableRanges="heatmapRanges"
            :rawHeatmapData="heatmapRawData"
            :chartHeight="heatmapChartHeight"
            @update:editableRanges="(v) => heatmapRanges = v"
          />
        </div>
        <div class="service-page-right">
          <InfoCard class="service-status-card">
            <template #title>Service Status</template>
            <template #info>
              <div class="status-grid">
                <span class="status-label">Service</span><span>{{ serverData?.service || 'N/A' }}</span>
                <span class="status-label">Address</span><span>{{ serverData?.address || 'N/A' }}</span>
                <span class="status-label">Port</span><span>{{ serverData?.port ?? 'N/A' }}</span>
                <span class="status-label">Status</span><span>{{ serverData?.isActive ? 'Active' : 'Inactive' }}</span>
                <span class="status-label">Primary</span><span>{{ serverData?.isPrimary ? 'Yes' : 'No' }}</span>
                <span class="status-label">Created</span><span>{{ serverData?.created ? formatDate(serverData.created) : 'N/A' }}</span>
              </div>
            </template>
          </InfoCard>
          <ServerStats
            :selectedServer="instanceLoad"
            :loading="loadLoading"
            :hasData="instanceLoad.hasData"
          />
          <ServiceLog class="service-log-flex" :serviceInstanceId="serviceInstanceId" :refreshKey="logRefreshKey" />
        </div>
      </div>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '~/stores/app';

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
const loadLoading = ref(false);
const instanceLoad = ref<any>({ cpu: 0, gpu: 0, ram: 0, latency: 0, hasData: false });
const logRefreshKey = ref(0);
const leftColRef = ref<HTMLElement | null>(null);
const heatmapChartHeight = ref(300);
let refreshIntervalId: number | null = null;

function updateChartHeights() {
  if (!leftColRef.value) return;
  const h = leftColRef.value.clientHeight;
  // Two flex children share height with 12px gap; heatmap card has 48px padding + 50px controls
  heatmapChartHeight.value = Math.max(150, Math.floor((h - 12) / 2) - 98);
}

let resizeObserver: ResizeObserver | null = null;

async function fetchInstanceLoad() {
  const id = getId();
  if (!id) return;
  loadLoading.value = true;
  try {
    const data: any = await $fetch(`/api/stats/instance-load/${encodeURIComponent(id)}`);
    instanceLoad.value = data;
  } catch (e) {
    console.error(e);
  } finally {
    loadLoading.value = false;
  }
}

const projectionState = useCadenzaProjectionState();

watch(
  () => projectionState.value.projectionState.activityVersion,
  (v, prev) => {
    if (prev === undefined) return;
    fetchInstanceLoad();
    fetchServerData();
    fetchStats();
    logRefreshKey.value++;
  },
);

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.toDateString()} ${dt.toLocaleTimeString()}`;
}

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

async function fetchServerData() {
  const id = getId();
  serviceInstanceId.value = id;
  try {
    serverData.value = await $fetch(`/api/activity/servers/${id}`);
  } catch (e) { console.error(e); }
}

async function fetchStats() {
  const id = getId();
  try {
    const data: any = await $fetch(`/api/activity/servers/serverStatistics?serviceInstanceId=${encodeURIComponent(id)}`);
    timeChartSeries.value = data?.series ?? [];
  } catch (e) { timeChartSeries.value = []; }
}

async function fetchHeatmap() {
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
}

async function loadAll() {
  pageLoading.value = true;
  try {
    await Promise.all([fetchServerData(), fetchStats(), fetchHeatmap()]);
  } finally {
    pageLoading.value = false;
  }
  await fetchInstanceLoad();
}

appStore.setCurrentSection('serviceActivity');

const { refresh } = await useAsyncData(`activity-service-detail:${getId()}`, async () => {
  await loadAll();
  return true;
});

const runtimeReady = useCadenzaRuntimeReady();

watch(
  runtimeReady,
  (isReady) => {
    if (refreshIntervalId !== null) {
      window.clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
    if (!isReady || !import.meta.client) {
      return;
    }
    refreshIntervalId = window.setInterval(() => {
      refresh();
      logRefreshKey.value++;
    }, 10000);
  },
  { immediate: true },
);

onMounted(async () => {

  await nextTick();
  updateChartHeights();
  resizeObserver = new ResizeObserver(updateChartHeights);
  if (leftColRef.value) resizeObserver.observe(leftColRef.value);
});

onBeforeUnmount(() => {
  if (refreshIntervalId !== null) {
    window.clearInterval(refreshIntervalId);
  }
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.service-page-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 12px;
  height: calc(100dvh - 80px);
}

.service-page-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  min-height: 0;
}

.service-page-left > * {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Make InfoCard fill its flex allocation */
.service-page-left :deep(.mac-info-card) {
  height: 100%;
  max-height: unset;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.service-page-left :deep(.mac-info-card-body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* HeatMap card fill */
.service-page-left :deep(.heatmap-container) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 60px;
}

.service-page-left :deep(.heatmap-container > div),
.service-page-left :deep(.heatmap-container > div > div) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.service-page-right {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  min-height: 0;
}

.service-log-flex {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.service-page-right :deep(.mac-info-card) {
  max-height: unset;
  min-width: unset;
  overflow: visible;
}

.service-page-right :deep(.mac-server-stats) {
  max-height: unset;
  max-width: unset;
}

.service-page-right :deep(.service-log-table) {
  flex: 1;
  max-height: unset;
}


.status-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  padding: 8px 16px 12px;
  font-size: 0.8125rem;
}

.status-label {
  color: var(--mac-text-tertiary);
  font-weight: 500;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .service-page-grid {
    grid-template-columns: 1fr;
    height: auto;
  }

  .service-page-left,
  .service-page-right {
    overflow: visible;
  }

  .service-log-flex {
    flex: none;
  }
}
</style>
