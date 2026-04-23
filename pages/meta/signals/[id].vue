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
          id-field="id"
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
  if (!item || item.signal) return;
  const name = item.name || item.id || '';
  if (name) router.push(`/meta/services/${encodeURIComponent(name)}`);
}

const fetchSignalTask = Cadenza.createTask('Fetch Meta Signal Definition', async (context) => {
  const id = getId();
  try {
    data.value = await $fetch(`/api/meta/signals/${encodeURIComponent(id)}`);
  } catch (e) { console.error(e); }
  return context;
});

const fetchNeighborsTask = Cadenza.createTask('Fetch Meta Signal Neighbors', async (context) => {
  const id = getId();
  try {
    const result: any = await $fetch(`/api/system/signals/neighbors?signalName=${encodeURIComponent(id)}`);
    const previousTasks = result?.previousTasks ?? [];
    const items: any[] = [];
    const sid = `signal-${id}`;

    for (const pt of previousTasks) {
      items.push({
        id: `svc-${pt.task_name}`,
        name: pt.task_name,
        label: pt.task_name,
        description: pt.task_description,
        previousTaskExecutionName: null,
      });
    }
    items.push({
      id: sid,
      name: id,
      label: id,
      description: data.value?.domain || '',
      signal: true,
      previousTaskExecutionName: previousTasks.length ? `svc-${previousTasks[0].task_name}` : null,
    });

    flowItems.value = items;
  } catch (e) { console.error(e); }
  return context;
});

onMounted(async () => {
  appStore.setCurrentSection('meta');
  loading.value = true;
  try {
    await Cadenza.run(Cadenza.createRoutine('Load Meta Signal', [fetchSignalTask, fetchNeighborsTask], ''), {});
  } finally {
    loading.value = false;
  }
});
</script>
