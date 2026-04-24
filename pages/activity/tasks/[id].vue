<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>
        {{ taskExecution?.name || String(route.params.id).slice(0, 8) }}
        <q-btn color="warning" size="sm" class="q-ml-sm" @click="showGenerateDialog = true">
          Generate Trace
        </q-btn>
      </template>

      <div>
        <FlowMap
          v-if="taskMap.length > 0"
          :items="taskMap"
          id-field="uuid"
          label-field="name"
          previous-field="previousTaskExecutionName"
          @item-selected="onItemSelected"
        />
      </div>

      <div class="q-mx-md">
        <InfoCard v-if="taskExecution" class="full-width">
          <template #title>{{ taskExecution.name }}</template>
          <template #info>
            <div class="row" style="flex-wrap: wrap;">
              <div class="col" style="min-width: 300px;">
                <div class="q-mx-md q-my-sm">UUID: {{ taskExecution.uuid }}</div>
                <div class="q-mx-md q-my-sm">Layer Index: {{ taskExecution.layerIndex }}</div>
                <div class="q-mx-md q-my-sm">Running: {{ taskExecution.isRunning }}</div>
                <div class="q-mx-md q-my-sm">Complete: {{ taskExecution.isComplete }}</div>
              </div>
              <div class="col" style="min-width: 300px;">
                <div class="row items-center">
                  <div class="col">
                    <div class="q-mx-md q-my-sm">Progress: {{ (taskExecution.progress * 100).toFixed(0) }}%</div>
                    <div class="q-mx-md q-my-sm">Success: {{ !taskExecution.failed && !taskExecution.errored }}</div>
                    <div class="q-mx-md q-my-sm">Started: {{ formatDate(taskExecution.started) }}</div>
                    <div class="q-mx-md q-my-sm">Ended: {{ formatDate(taskExecution.ended) }}</div>
                    <div class="q-mx-md q-my-sm">Duration: {{ getDuration(taskExecution.started, taskExecution.ended) }}s</div>
                  </div>
                  <div class="col-auto">
                    <ProgressRadialBarChart :name="taskExecution.name" :value="String(taskExecution.progress ?? 0)" />
                  </div>
                </div>
              </div>
              <div class="col" style="min-width: 300px;">
                <div
                  v-if="taskExecution.routineExecutionId"
                  class="q-mx-md q-my-sm cursor-pointer text-warning"
                  @click="router.push(`/activity/routines/${taskExecution.routineExecutionId}`)"
                >Routine Execution: {{ taskExecution.routineExecutionId }}</div>
                <div
                  v-if="taskExecution.traceId"
                  class="q-mx-md q-my-sm cursor-pointer text-warning"
                  @click="router.push(`/activity/traces/${taskExecution.traceId}`)"
                >Trace: {{ taskExecution.traceId }}</div>
                <div
                  v-if="taskExecution.name"
                  class="q-mx-md q-my-sm cursor-pointer text-primary"
                  @click="router.push(`/system/tasks/${encodeURIComponent(taskExecution.name)}`)"
                >Task Definition: {{ taskExecution.name }}</div>
                <div
                  v-if="taskExecution.service"
                  class="q-mx-md q-my-sm cursor-pointer text-primary"
                  @click="router.push(`/system/services/${taskExecution.service}`)"
                >Service: {{ taskExecution.service }}</div>
              </div>
            </div>
          </template>
        </InfoCard>
      </div>

      <div v-if="taskExecution" class="row q-mx-md q-mt-md" style="flex-wrap: wrap; gap: 16px;">
        <InfoCard class="col" style="min-width: 300px;">
          <template #title>Input Context</template>
          <template #info>
            <div class="q-mx-md q-my-sm">
              <pre style="max-height: 240px; overflow: auto; font-size: 13px;">{{ JSON.stringify(taskExecution.inputContext, null, 2) }}</pre>
            </div>
          </template>
        </InfoCard>
        <InfoCard class="col" style="min-width: 300px;">
          <template #title>Output Context</template>
          <template #info>
            <div class="q-mx-md q-my-sm">
              <pre style="max-height: 240px; overflow: auto; font-size: 13px;">{{ JSON.stringify(taskExecution.outputContext, null, 2) }}</pre>
            </div>
          </template>
        </InfoCard>
        <InfoCard v-if="taskExecution.functionString" class="col" style="min-width: 300px;">
          <template #title>Task Function</template>
          <template #info>
            <div class="q-mx-md q-my-sm">
              <pre style="max-height: 240px; overflow: auto; font-size: 13px;">{{ taskExecution.functionString }}</pre>
            </div>
          </template>
        </InfoCard>
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
import Cadenza from '@cadenza.io/service';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const taskExecution = ref<any>(null);
const taskMap = ref<any[]>([]);
const showGenerateDialog = ref(false);

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

function formatDate(d?: string) {
  if (!d) return 'N/A';
  const dt = new Date(d);
  return `${dt.toDateString()} ${dt.toLocaleTimeString()}`;
}

function getDuration(start?: string, end?: string) {
  if (!start) return 'N/A';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  return ((e - s) / 1000).toFixed(2);
}

const fetchExecutionTask = Cadenza.createTask('Fetch Activity Task Execution', async (context) => {
  const id = getId();
  try {
    taskExecution.value = await $fetch(`/api/activity/tasks/${id}`);
  } catch (e) { console.error(e); }
  return context;
});

const fetchMapTask = Cadenza.createTask('Fetch Activity Task Map', async (context) => {
  const id = getId();
  try {
    const data: any = await $fetch(`/api/activity/tasks/tasksInRoutines?task_execution_id=${id}`);
    const arr = Array.isArray(data) ? data : (data?.nodes ?? []);
    taskMap.value = arr.map((t: any) => ({ ...t, id: t.uuid || t.id }));
  } catch (e) {
    taskMap.value = [];
  }
  return context;
});

function onItemSelected(item: any) {
  if (!item) return;
  const execId = item.uuid || item.id;
  if (execId) router.push(`/activity/tasks/${execId}`);
}

onMounted(async () => {
  appStore.setCurrentSection('serviceActivity');
  await Cadenza.run(Cadenza.createRoutine('Load Activity Task', [fetchExecutionTask, fetchMapTask], ''), {});
});
</script>
