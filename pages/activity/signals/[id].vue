<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>{{ data?.name || String(route.params.id).slice(0, 8) }}</template>

      <q-inner-loading :showing="loading">
        <q-spinner-gears size="80px" color="primary" />
      </q-inner-loading>

      <div v-if="!loading && data">
        <FlowMap
          v-if="flowItems.length > 0"
          :items="flowItems"
          id-field="id"
          label-field="label"
          previous-field="previousTaskExecutionName"
          @item-selected="onItemSelected"
        />
        <div class="row q-ma-md" style="gap: 24px;">
          <InfoCard style="flex: 1;">
            <template #title>Signal Emission</template>
            <template #info>
              <div class="flex-column full-width">
                <div class="q-mx-md q-my-sm">UUID: {{ data.uuid }}</div>
                <div class="q-mx-md q-my-sm">
                  Signal:
                  <span
                    class="text-primary cursor-pointer"
                    @click="router.push(`/system/signals/${encodeURIComponent(data.name)}`)"
                  >{{ data.name }}</span>
                </div>
                <div class="q-separator" style="height: 2px"></div>
                <div class="q-mx-md q-my-sm">Meta: {{ data.isMeta }}</div>
                <div class="q-mx-md q-my-sm">
                  Emitter Service:
                  <span
                    v-if="data.emitterService"
                    class="text-primary cursor-pointer"
                    @click="router.push(`/system/services/${data.emitterService}`)"
                  >{{ data.emitterService }}</span>
                  <span v-else>N/A</span>
                </div>
                <div class="q-mx-md q-my-sm">
                  Routine Execution:
                  <span
                    v-if="data.routineExecutionId"
                    class="text-warning cursor-pointer"
                    @click="router.push(`/activity/routines/${data.routineExecutionId}`)"
                  >{{ data.routineExecutionId }}</span>
                  <span v-else>N/A</span>
                </div>
                <div class="q-mx-md q-my-sm">
                  Task Execution:
                  <span
                    v-if="data.taskExecutionId"
                    class="text-warning cursor-pointer"
                    @click="router.push(`/activity/tasks/${data.taskExecutionId}`)"
                  >{{ data.taskExecutionId }}</span>
                  <span v-else>N/A</span>
                </div>
                <div class="q-mx-md q-my-sm">Created: {{ data.created ? formatDate(data.created) : 'N/A' }}</div>
              </div>
            </template>
          </InfoCard>
        </div>
      </div>
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
const loading = ref(true);
const data = ref<any>(null);
const flowItems = ref<any[]>([]);

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.toDateString()} ${dt.toLocaleTimeString()}`;
}

function onItemSelected(item: any) {
  if (!item) return;
  const id = item.uuid || item.id || '';
  if (!id || String(id).startsWith('signal-')) return;
  router.push(`/activity/tasks/${id}`);
}

function buildFlowItems() {
  if (!data.value) return;
  const items: any[] = [];
  const sigId = `signal-${data.value.uuid}`;

  if (data.value.taskExecutionId) {
    items.push({
      id: data.value.taskExecutionId,
      uuid: data.value.taskExecutionId,
      label: `Task (${data.value.taskExecutionId.slice(0, 8)})`,
      previousTaskExecutionName: null,
    });
  }

  items.push({
    id: sigId,
    label: data.value.name || 'Signal',
    signal: true,
    previousTaskExecutionName: data.value.taskExecutionId || null,
  });

  for (const c of (data.value.consumers ?? [])) {
    items.push({
      id: c.uuid,
      uuid: c.uuid,
      label: c.taskName || `Task (${c.uuid.slice(0, 8)})`,
      previousTaskExecutionName: sigId,
    });
  }

  flowItems.value = items;
}

const fetchTask = Cadenza.createTask('Fetch Signal Emission Detail', async (context) => {
  const id = String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
  try {
    data.value = await $fetch(`/api/activity/signals/${id}`);
    buildFlowItems();
  } catch (e) { console.error(e); }
  return context;
});

onMounted(async () => {
  appStore.setCurrentSection('serviceActivity');
  loading.value = true;
  try {
    await Cadenza.run(Cadenza.createRoutine('Load Signal Emission', [fetchTask], ''), {});
  } finally {
    loading.value = false;
  }
});
</script>
