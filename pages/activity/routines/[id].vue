<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>
        {{ routineData?.label || String(route.params.id).slice(0, 8) }}
        <q-btn color="warning" size="sm" class="q-ml-sm" @click="showGenerateDialog = true">
          Generate Trace
        </q-btn>
      </template>

      <div>
        <div class="q-pa-md">
          <q-tabs v-model="selectedTab" dense active-color="primary" indicator-color="primary" align="justify" narrow-indicator>
            <q-tab name="routineMap" label="Map" />
            <q-tab name="timeline" label="Timeline" />
            <q-tab name="rangedTimeline" label="Ranged Timeline" />
          </q-tabs>
          <q-separator />

          <div v-show="selectedTab === 'routineMap'">
            <div v-if="mapLoading" class="flex justify-center items-center" style="min-height: 400px;">
              <q-spinner-dots size="48px" color="primary" />
            </div>
            <FlowMap
              v-else-if="routineMap.length > 0"
              :items="routineMap"
              id-field="uuid"
              label-field="label"
              previous-field="previousTaskExecutionId"
              @item-selected="onItemSelected"
              style="width: 100%"
            />
            <div v-else class="flex flex-column items-center justify-center q-pa-xl text-grey-5" style="min-height: 200px;">
              <q-icon name="account_tree" size="48px" />
              <div class="q-mt-sm">No task executions recorded for this routine</div>
            </div>
          </div>

          <div v-show="selectedTab === 'timeline'">
            <ApexTimeline :itemMap="routineMap" :loading="mapLoading" />
          </div>

          <div v-show="selectedTab === 'rangedTimeline'">
            <ApexTimeline :itemMap="routineMap" :loading="mapLoading" />
          </div>
        </div>

        <div class="row q-mx-md justify-around">
          <InfoCard v-if="routineData" class="full-width">
            <template #title>{{ routineData.label }}</template>
            <template #info>
              <div class="row" style="flex-wrap: wrap;">
                <div class="col" style="min-width: 300px;">
                  <div class="q-mx-md q-my-sm">UUID: {{ routineData.uuid }}</div>
                  <div class="q-mx-md q-my-sm">Executed tasks: {{ routineMap.length }}</div>
                  <div class="q-mx-md q-my-sm">Started: {{ routineData.started ? formatDate(routineData.started) : 'N/A' }}</div>
                  <div class="q-mx-md q-my-sm">Ended: {{ routineData.ended ? formatDate(routineData.ended) : 'N/A' }}</div>
                  <div class="q-mx-md q-my-sm">Duration: {{ routineData.duration || 'N/A' }} sec</div>
                </div>
                <div class="col" style="min-width: 300px;">
                  <div class="row items-center">
                    <div class="col">
                      <div class="q-mx-md q-my-sm">Progress: {{ (Number(routineData.progress) * 100).toFixed(0) }}%</div>
                      <div class="q-mx-md q-my-sm">Status: {{ routineData.status }}</div>
                      <div class="q-mx-md q-my-sm">Created: {{ routineData.created ? formatDate(routineData.created) : 'N/A' }}</div>
                    </div>
                    <div class="col-auto">
                      <ProgressRadialBarChart :name="routineData.label" :value="String(routineData.progress ?? 0)" />
                    </div>
                  </div>
                </div>
                <div class="col" style="min-width: 300px;">
                  <div
                    v-if="routineData.executionTraceId"
                    class="q-mx-md q-my-sm cursor-pointer text-warning"
                    @click="router.push(`/activity/traces/${routineData.executionTraceId}`)"
                  >Trace: {{ routineData.executionTraceId }}</div>
                  <div
                    v-if="routineData.serviceName"
                    class="q-mx-md q-my-sm cursor-pointer text-primary"
                    @click="router.push(`/system/services/${routineData.serviceName}`)"
                  >Service: {{ routineData.serviceName }}</div>
                </div>
              </div>
            </template>
          </InfoCard>

          <InfoCard v-if="selectedTask" class="full-width q-mt-md">
            <template #title>{{ selectedTask.label }}</template>
            <template #info>
              <div class="flex-column full-width">
                <div class="q-mx-md q-my-sm">UUID: {{ selectedTask.uuid }}</div>
                <div class="row items-center">
                  <div class="col">
                    <div class="q-mx-md q-my-sm">Progress: {{ (Number(selectedTask.progress) * 100).toFixed(0) }}%</div>
                    <div class="q-mx-md q-my-sm">Started: {{ formatDate(selectedTask.started) }}</div>
                    <div class="q-mx-md q-my-sm">Ended: {{ formatDate(selectedTask.ended) }}</div>
                    <div class="q-mx-md q-my-sm">Success: {{ !selectedTask.failed && !selectedTask.errored }}</div>
                  </div>
                  <ProgressRadialBarChart :name="selectedTask.label" :value="String(selectedTask.progress ?? 0)" />
                </div>
                <div
                  class="q-mx-md q-my-sm cursor-pointer text-warning"
                  @click="router.push(`/activity/tasks/${selectedTask.uuid}`)"
                >View full execution details</div>
              </div>
            </template>
          </InfoCard>
        </div>
      </div>

      <q-dialog v-model="showGenerateDialog">
        <q-card>
          <q-card-section><div class="text-h6">Confirm Generate</div><div style="color: red;">In development — not functional</div></q-card-section>
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
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '~/stores/app';
import Cadenza from '@cadenza.io/core';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const routineData = ref<any>(null);
const routineMap = ref<any[]>([]);
const selectedTask = ref<any>(null);
const selectedTab = ref('routineMap');
const mapLoading = ref(false);
const showGenerateDialog = ref(false);

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

function formatDate(d: string | null) {
  if (!d) return 'N/A';
  const dt = new Date(d);
  return `${dt.toDateString()} ${dt.toLocaleTimeString()}`;
}

const fetchRoutineTask = Cadenza.createTask('Fetch Activity Routine Detail', async (context) => {
  const id = getId();
  mapLoading.value = true;
  try {
    routineData.value = await $fetch(`/api/activity/routines/${id}`);
  } catch (e) { console.error(e); }
  return context;
});

const fetchMapTask = Cadenza.createTask('Fetch Activity Routine Map', async (context) => {
  try {
    if (!routineData.value?.uuid) return context;
    const data: any = await $fetch(`/api/activity/routines/tasks?routineExecutionId=${routineData.value.uuid}`);
    routineMap.value = Array.isArray(data) ? data : [];
  } catch (e) {
    routineMap.value = [];
  } finally {
    mapLoading.value = false;
  }
  return context;
});

function onItemSelected(item: any) {
  if (!item) return;
  selectedTask.value = routineMap.value.find((t) => t.uuid === (item.uuid || item.id)) ?? null;
}

onMounted(async () => {
  appStore.setCurrentSection('serviceActivity');
  await Cadenza.run(Cadenza.createRoutine('Load Activity Routine', [fetchRoutineTask, fetchMapTask], ''), {});
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
