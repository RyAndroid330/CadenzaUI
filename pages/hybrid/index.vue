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
  const signalServiceMap = new Map<string, string>();
  const globalSignals = new Set<string>(
    (data.signalToTaskEdges ?? []).filter((e: any) => e.isGlobal).map((e: any) => e.signalName)
  );

  for (const r of (data.routineMap ?? [])) taskRoutineMap.set(r.taskName, r.routineName);
  for (const e of (data.taskSignalEdges ?? [])) {
    if (!signalServiceMap.has(e.signalName) && e.serviceName) signalServiceMap.set(e.signalName, e.serviceName);
  }

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
  for (const sig of (data.signals ?? [])) {
    const isGlobal = globalSignals.has(sig.name);
    const parentService = isGlobal ? undefined : signalServiceMap.get(sig.name);
    result.push({ id: `signal:${sig.name}`, type: 'custom', nodeType: 'signal', parentNode: parentService || undefined, position: { x: 0, y: 0 }, data: { label: sig.name, domain: sig.domain, action: sig.action, isGlobal, signal: true }, ...(parentService ? { extent: 'parent', expandParent: true } : {}) });
  }
  return result;
}

const fetchTask = Cadenza.createTask('Fetch Hybrid Map', async (context) => {
  try {
    const data: any = await $fetch('/api/system/graph');
    nodes.value = buildGraphNodes(data);
    const taskEdges = (data.graph ?? []).map((g: any) => ({
      id: `${g.previousTaskName}-${g.taskName}`,
      source: g.previousTaskName,
      target: g.taskName,
      style: { strokeWidth: 2 },
    }));
    const emitEdges = (data.taskSignalEdges ?? []).map((e: any) => ({
      id: `emit-${e.taskName}-signal:${e.signalName}`,
      source: e.taskName,
      target: `signal:${e.signalName}`,
      style: { strokeWidth: 1.5, strokeDasharray: '4 2' },
    }));
    const triggerEdges = (data.signalToTaskEdges ?? []).map((e: any) => ({
      id: `trigger-signal:${e.signalName}-${e.taskName}-${e.serviceName}`,
      source: `signal:${e.signalName}`,
      target: e.taskName,
      style: { strokeWidth: 1.5, strokeDasharray: '4 2' },
    }));
    edges.value = [...taskEdges, ...emitEdges, ...triggerEdges];
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
