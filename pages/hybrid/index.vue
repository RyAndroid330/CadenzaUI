<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title> Hybrid System View </template>
      <div style="height: 80dvh">
        <hybridFlowMap :nodes="nodes" :edges="edges" style="height: 100%; width: 100%" @item-selected="handleNodeSelected" />
      </div>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '~/stores/app';
import { useRouter } from 'vue-router';
import Cadenza from '@cadenza.io/core';

const router = useRouter();
const appStore = useAppStore();
const nodes = ref<any[]>([]);
const edges = ref<any[]>([]);

function buildGraphNodes(data: any) {
  const result: any[] = [];
  const routineNames = new Set<string>();
  const taskRoutineMap = new Map<string, string>();

  for (const r of (data.routineMap ?? [])) taskRoutineMap.set(r.taskName, r.routineName);

  for (const svc of (data.services ?? [])) {
    result.push({ id: svc.name, type: 'custom', nodeType: 'service', position: { x: 0, y: 0 }, data: { label: svc.name, service: true }, extent: 'parent', expandParent: true });
  }
  for (const r of (data.routineMap ?? [])) {
    if (!routineNames.has(r.routineName)) {
      routineNames.add(r.routineName);
      result.push({ id: r.routineName, type: 'custom', nodeType: 'routine', parentNode: r.serviceName, position: { x: 0, y: 0 }, data: { label: r.routineName, routine: true }, extent: 'parent', expandParent: true });
    }
  }
  for (const task of (data.tasks ?? [])) {
    const routineName = taskRoutineMap.get(task.name);
    result.push({ id: task.name, type: 'custom', nodeType: 'task', parentNode: routineName || task.service, position: { x: 0, y: 0 }, data: { label: task.name, taskName: task.name, service_name: task.service }, extent: 'parent', expandParent: true });
  }
  return result;
}

const fetchTask = Cadenza.createTask('Fetch Hybrid Map', async (context) => {
  try {
    const data: any = await $fetch('/api/system/graph');
    nodes.value = buildGraphNodes(data);
    edges.value = (data.graph ?? []).map((g: any) => ({
      id: `${g.previousTaskName}-${g.taskName}`,
      source: g.previousTaskName,
      target: g.taskName,
      style: { strokeWidth: 2 },
    }));
  } catch (e) {
    console.error('Error loading hybrid map:', e);
  }
  return context;
});

onMounted(() => {
  appStore.setCurrentSection('home');
  Cadenza.run(Cadenza.createRoutine('Init Hybrid', [fetchTask], ''), {});
});

function handleNodeSelected(node: any) {
  const n = node?.node || node;
  if (n.nodeType === 'task') {
    const name = n.data?.label || n.id;
    if (name) router.push(`/system/tasks/${encodeURIComponent(name)}`);
  } else if (n.nodeType === 'signal') {
    const name = n.data?.label || n.id;
    if (name) router.push(`/system/signals/${encodeURIComponent(name)}`);
  } else if (n.nodeType === 'service') {
    const name = n.data?.label || n.id;
    if (name) router.push(`/system/services/${encodeURIComponent(name)}`);
  }
}
</script>
