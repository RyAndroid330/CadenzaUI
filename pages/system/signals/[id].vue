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
            <template #title>Signal Definition</template>
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
          <ExecutionStatisticsPieChart style="flex: 1;" type="signal" :signalName="String(route.params.id)" />
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

function getId() {
  return String(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
}

function onItemSelected(item: any) {
  if (!item || item.signal) return;
  const name = item.name || item.id || '';
  if (name) router.push(`/system/tasks/${encodeURIComponent(name)}`);
}


const loadAllTask = Cadenza.createTask('Load Signal All', async (context) => {
  try {
    await Promise.allSettled([
      $fetch(`/api/system/signals/${encodeURIComponent(getId())}`).then((d) => { data.value = d; }).catch(console.error),
      $fetch(`/api/system/signals/neighbors?signalName=${encodeURIComponent(getId())}`).then((result: any) => {
        const emittingTasks: any[] = result?.emittingTasks ?? [];
        const followingTasks: any[] = result?.followingTasks ?? [];
        const id = getId();
        const signalId = `signal:${id}`;
        const items: any[] = [];
        for (const t of emittingTasks) {
          items.push({ id: t.name, name: t.name, label: t.name, description: t.description || '', previousTaskExecutionName: null });
        }
        const emitters = emittingTasks.map((t) => t.name);
        items.push({ id: signalId, name: id, label: id, description: '', signal: true, previousTaskExecutionName: emitters.length === 1 ? emitters[0] : emitters.length > 1 ? emitters : null });
        for (const t of followingTasks) {
          items.push({ id: t.name, name: t.name, label: t.name, description: t.description || '', previousTaskExecutionName: signalId });
        }
        flowItems.value = items;
      }).catch(console.error),
    ]);
  } finally {
    loading.value = false;
  }
  return context;
});

onMounted(() => {
  appStore.setCurrentSection('system');
  loading.value = true;
  Cadenza.run(Cadenza.createRoutine('Load Signal Definition', [loadAllTask], ''), {});
});
</script>
