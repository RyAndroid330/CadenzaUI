<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title> Welcome </template>

      <div class="mac-home-grid">
        <div class="mac-welcome-card">
          <div class="mac-welcome-icon"><q-icon name="waving_hand" size="32px" /></div>
          <h2 class="mac-welcome-heading">Welcome to Cadenza</h2>
          <p class="mac-welcome-text">
            Manage your server tasks, create routines, build services, and generate traces.
            Access all your server statistics and running processes from one place.
          </p>
        </div>
        <CollapsibleSection title="Server Load" icon="speed" section="system" :default-open="true">
          <ServerStats :selectedServer="aggregatedServer" :loading="isLoadingServerStats" :hasData="activeInstances.length > 0" />
        </CollapsibleSection>
      </div>

      <div class="mac-home-stats-row">
        <CollapsibleSection title="Execution Statistics" icon="pie_chart" :default-open="true">
          <ExecutionStatisticsPieChart />
        </CollapsibleSection>
        <CollapsibleSection title="Service Log" icon="list_alt" section="activity" :default-open="true">
          <ServiceLog :allServices="true" :initialFilters="{ critical: true, error: true, warning: false, info: false }" />
        </CollapsibleSection>
      </div>

      <CollapsibleSection title="Activity Heatmap" icon="grid_view" class="mac-home-section" :default-open="true">
        <HeatMap
          :loading="isLoadingHeatmap"
          :hasData="hasHeatmapData"
          :chartSeries="[]"
          :yearOptions="heatmapYearOptions"
          :monthNames="MONTH_NAMES"
          :editableRanges="defaultHeatmapRanges"
          :rawHeatmapData="heatmapRawData"
        />
      </CollapsibleSection>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useAppStore } from '~/stores/app';
import CollapsibleSection from '~/components/CollapsibleSection.vue';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const defaultHeatmapRanges = [{ from: 1, to: 10 }, { from: 11, to: 50 }, { from: 51, to: 100 }, { from: 101, to: 99999 }];

const appStore = useAppStore();
const serverLoad = ref<{ cpu: number; gpu: number; ram: number; latency: number; instanceCount: number } | null>(null);
const heatmapRawData = ref<any[]>([]);
const heatmapYearOptions = ref<number[]>([new Date().getFullYear()]);
const isLoadingServerStats = ref(false);
const isLoadingHeatmap = ref(false);
let refreshIntervalId: number | null = null;

const hasHeatmapData = computed(() => heatmapRawData.value.length > 0);
const aggregatedServer = computed(() => serverLoad.value ?? { cpu: 0, gpu: 0, ram: 0 });
const activeInstances = computed(() => serverLoad.value?.instanceCount ? [{}] : []);

async function fetchServerLoad() {
  try {
    const data: any = await $fetch('/api/stats/server-load');
    serverLoad.value = data;
  } catch (e) {
    console.error(e);
  } finally {
    isLoadingServerStats.value = false;
  }
}

function applyHeatmapData(data: any) {
  try {
    const raw = data?.data ?? [];
    heatmapRawData.value = raw;
    const years = new Set<number>();
    for (const r of raw) { const y = new Date(r.date).getFullYear(); if (!isNaN(y)) years.add(y); }
    heatmapYearOptions.value = years.size ? [...years].sort((a, b) => b - a) : [new Date().getFullYear()];
  } catch (e) {
    console.error(e);
  } finally {
    isLoadingHeatmap.value = false;
  }
}

appStore.setCurrentSection('');
appStore.setLoggedIn(true);

const { refresh } = await useAsyncData('home-dashboard-overview', async () => {
  isLoadingServerStats.value = true;
  isLoadingHeatmap.value = true;
  const [serverLoadData, heatmapData] = await Promise.all([
    $fetch('/api/stats/server-load'),
    $fetch('/api/heatmap/routines'),
  ]);
  serverLoad.value = serverLoadData as any;
  applyHeatmapData(heatmapData);
  return true;
});

const projectionState = useCadenzaProjectionState();
const runtimeReady = useCadenzaRuntimeReady();

watch(
  () => projectionState.value.projectionState.activityVersion,
  (_value, prev) => { if (prev !== undefined) refresh(); },
);

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
    }, 10000);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (refreshIntervalId !== null) {
    window.clearInterval(refreshIntervalId);
  }
});
</script>

<style scoped>
.mac-home-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 16px;
  align-items: start;
}

@media (max-width: 960px) {
  .mac-home-grid {
    grid-template-columns: 1fr;
  }
}

.mac-welcome-card {
  background: var(--mac-surface);
  border: 1px solid var(--mac-border);
  border-radius: var(--mac-radius-md);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: var(--mac-shadow-sm);
}

@media (max-width: 639px) {
  .mac-welcome-card {
    padding: 20px 16px;
  }
}

.mac-welcome-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 122, 255, 0.08);
  border-radius: var(--mac-radius-md);
  margin-bottom: 14px;
  color: var(--mac-accent);
}

.mac-welcome-heading {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--mac-text-primary);
  margin: 0 0 8px;
}

@media (max-width: 639px) {
  .mac-welcome-heading {
    font-size: 1.125rem;
  }
}

.mac-welcome-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--mac-text-secondary);
  margin: 0;
}

@media (max-width: 639px) {
  .mac-welcome-text {
    font-size: 0.875rem;
  }
}

.mac-home-stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  align-items: start;
}

@media (max-width: 960px) {
  .mac-home-stats-row {
    grid-template-columns: 1fr;
  }
}

.mac-home-section {
  margin-bottom: 16px;
}
</style>
