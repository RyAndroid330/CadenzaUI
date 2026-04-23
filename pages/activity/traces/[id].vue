<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>
        Trace {{ traceData?.uuid?.slice(0, 8) || String(route.params.id).slice(0, 8) }}
        <q-btn color="primary" size="sm" class="q-ml-sm" @click="showGenerateDialog = true">
          Regenerate Trace
        </q-btn>
      </template>

      <q-inner-loading :showing="loading">
        <q-spinner-gears size="80px" color="primary" />
      </q-inner-loading>

      <div v-if="!loading">
        <div class="q-pa-md">
          <q-tabs v-model="selectedTab" dense active-color="primary" indicator-color="primary" align="justify" narrow-indicator>
            <q-tab name="map" label="Map" />
            <q-tab name="timeline" label="Timeline" />
            <q-tab name="rangedTimeline" label="Ranged Timeline" />
          </q-tabs>
          <q-separator />

          <div v-show="selectedTab === 'map'">
            <NestedFlowMap
              v-if="nodes.length > 0"
              :nodes="nodes"
              :edges="edges"
              @item-selected="onNodeSelected"
            />
            <div v-else class="flex flex-column items-center justify-center q-pa-xl text-grey-5" style="min-height: 200px;">
              <q-icon name="account_tree" size="48px" />
              <div class="q-mt-sm">No map data available for this trace</div>
            </div>
          </div>

          <div v-show="selectedTab === 'timeline'">
            <Timeline :itemMap="timelineItems" />
          </div>

          <div v-show="selectedTab === 'rangedTimeline'">
            <ApexTimeline :itemMap="rangedTimelineItems" />
          </div>
        </div>

        <div class="q-mx-md q-mt-md">
          <div class="row" style="flex-wrap: wrap; gap: 16px;">
            <InfoCard style="flex: 1; min-width: 280px;">
              <template #title>Trace Info</template>
              <template #info>
                <div class="flex-column full-width">
                  <div class="q-mx-md q-my-sm">
                    Created: {{ traceData?.created ? formatDate(traceData.created) : 'N/A' }}
                  </div>
                  <div class="q-mx-md q-my-sm">
                    Service:
                    <span
                      v-if="traceData?.service"
                      class="text-primary cursor-pointer"
                      @click="router.push(`/system/services/${traceData.service}`)"
                    >{{ traceData.service }}</span>
                    <span v-else>N/A</span>
                  </div>
                  <div class="q-mx-md q-my-sm">Routines: {{ traceData?.routines?.length ?? 0 }}</div>
                </div>
              </template>
            </InfoCard>
            <InfoCard style="flex: 1; min-width: 280px;">
              <template #title>Input Context</template>
              <template #info>
                <div class="q-mx-md q-my-sm">
                  <pre style="max-height: 240px; overflow: auto; font-size: 13px;">{{ traceData ? JSON.stringify({ uuid: traceData.uuid, service: traceData.service, created: traceData.created }, null, 2) : '' }}</pre>
                </div>
              </template>
            </InfoCard>
          </div>
        </div>
      </div>

      <q-dialog v-model="showGenerateDialog">
        <q-card>
          <q-card-section>
            <div class="text-h6">Confirm Generate</div>
            <div>Are you sure you want to regenerate this trace?</div>
            <div style="color: red;">In development — not functional</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" @click="showGenerateDialog = false" />
            <q-btn flat label="Confirm" color="secondary" @click="showGenerateDialog = false" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/core';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const loading = ref(true);
const traceData = ref<any>(null);
const selectedTab = ref('map');
const showGenerateDialog = ref(false);

const nodes = computed(() => traceData.value?.nodes ?? []);
const edges = computed(() => traceData.value?.edges ?? []);

const timelineItems = computed(() =>
  (traceData.value?.routines ?? []).map((r: any) => ({
    uuid: r.uuid,
    name: r.name,
    label: r.name,
    started: r.started || r.created,
    ended: r.ended || null,
    created: r.created,
    progress: r.progress ?? 0,
    isComplete: r.isComplete,
    isRunning: r.isRunning,
    errored: r.errored,
    failed: r.failed ?? false,
  }))
);

const rangedTimelineItems = computed(() =>
  nodes.value
    .filter((n: any) => n.nodeType === 'task' || n.nodeType === 'signal')
    .map((n: any) => ({
      uuid: n.id,
      name: n.data?.label || n.id,
      label: n.data?.label || n.id,
      started: n.data?.started || n.data?.created || null,
      ended: n.data?.ended || null,
      created: n.data?.created || null,
      progress: n.progress ?? 0,
      errored: n.errored ?? false,
      failed: n.failed ?? false,
      isComplete: n.isComplete ?? false,
      signal: n.nodeType === 'signal',
      type: n.nodeType,
    }))
    .sort((a: any, b: any) => {
      const ta = a.started ? new Date(a.started).getTime() : 0;
      const tb = b.started ? new Date(b.started).getTime() : 0;
      return ta - tb;
    })
);

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.toDateString()} ${dt.toLocaleTimeString()}`;
}

function onNodeSelected(node: any) {
  const n = node?.node || node;
  if (!n) return;
  if (n.nodeType === 'task') {
    const id = n.id || n.data?.uuid;
    if (id) router.push(`/activity/tasks/${encodeURIComponent(id)}`);
  } else if (n.nodeType === 'signal') {
    const id = n.data?.uuid || n.id;
    if (id) router.push(`/activity/signals/${encodeURIComponent(id)}`);
  } else if (n.nodeType === 'service') {
    const id = n.id || n.data?.uuid;
    if (id) router.push(`/activity/services/${encodeURIComponent(id)}`);
  }
}

const fetchTraceTask = Cadenza.createTask('Fetch Trace Data', async (context) => {
  const id = String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
  try {
    traceData.value = await $fetch(`/api/activity/traces/${id}`);
  } catch (e) { console.error(e); }
  return context;
});

onMounted(async () => {
  appStore.setCurrentSection('serviceActivity');
  loading.value = true;
  try {
    await Cadenza.run(Cadenza.createRoutine('Load Trace', [fetchTraceTask], ''), {});
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
