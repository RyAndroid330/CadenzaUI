<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>{{ data?.name || String(route.params.id) }}</template>

      <q-inner-loading :showing="loading">
        <q-spinner-gears size="80px" color="primary" />
      </q-inner-loading>

      <div v-if="!loading && data">
        <FlowMap
          v-if="flowItems.length > 0"
          :items="flowItems"
          id-field="name"
          label-field="label"
          previous-field="previousTaskExecutionName"
          @item-selected="onItemSelected"
        />
        <div class="row q-ma-md" style="gap: 24px;">
          <InfoCard style="flex: 1;">
            <template #title>Signal Definition (Meta)</template>
            <template #info>
              <div class="flex-column full-width">
                <div class="q-mx-md q-my-sm">Name: {{ data.name }}</div>
                <div class="q-mx-md q-my-sm">Domain: {{ data.domain || 'N/A' }}</div>
                <div class="q-mx-md q-my-sm">Action: {{ data.action || 'N/A' }}</div>
                <div class="q-mx-md q-my-sm">Global: {{ data.isGlobal ? 'Yes' : 'No' }}</div>
                <div class="q-mx-md q-my-sm">Meta: {{ data.isMeta ? 'Yes' : 'No' }}</div>
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
import Cadenza from '@cadenza.io/core';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const loading = ref(true);
const data = ref<any>(null);
const flowItems = ref<any[]>([]);

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

function onItemSelected(item: any) {
  if (!item) return;
  if (item.signal) return;
  const name = item.name || item.id || '';
  if (name) router.push(`/meta/tasks/${encodeURIComponent(name)}`);
}

const fetchAllTask = Cadenza.createTask('Fetch Meta Signal Definition', async (context) => {
  const id = getId();
  const sigId = `signal:${id}`;
  const [defResult, graphResult] = await Promise.allSettled([
    $fetch<any>(`/api/meta/signals/${encodeURIComponent(id)}`),
    $fetch<any>('/api/meta/graph'),
  ]);

  if (defResult.status === 'fulfilled') data.value = defResult.value;

  if (graphResult.status === 'fulfilled') {
    const g = graphResult.value as any;
    const taskSignalEdges: any[] = g?.taskSignalEdges ?? [];
    const signalToTaskEdges: any[] = g?.signalToTaskEdges ?? [];

    const emitters = taskSignalEdges.filter((e) => e.signalName === id).map((e) => e.taskName);
    const triggered = signalToTaskEdges.filter((e) => e.signalName === id).map((e) => e.taskName);

    const items: any[] = [];
    for (const t of emitters) {
      items.push({ name: t, label: t, description: '', previousTaskExecutionName: null });
    }
    items.push({
      name: sigId,
      label: id,
      description: data.value?.domain || '',
      signal: true,
      previousTaskExecutionName: emitters.length === 1 ? emitters[0] : emitters.length > 1 ? emitters : null,
    });
    for (const t of triggered) {
      items.push({ name: t, label: t, description: '', previousTaskExecutionName: sigId });
    }
    flowItems.value = items;
  }
  return context;
});

onMounted(async () => {
  appStore.setCurrentSection('meta');
  loading.value = true;
  try {
    await Cadenza.run(Cadenza.createRoutine('Load Meta Signal', [fetchAllTask], ''), {});
  } finally {
    loading.value = false;
  }
});
</script>
