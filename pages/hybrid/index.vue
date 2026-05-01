<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title> Hybrid System View </template>
      <div style="height: 80dvh">
        <hybridFlowMap :nodes="nodes" :edges="edges" :activeTaskNames="activeTaskNames" :activeSignalNames="activeSignalNames" :activeTaskCounts="activeTaskCounts" style="height: 100%; width: 100%" @item-selected="handleNodeSelected" />
      </div>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useAppStore } from '~/stores/app';
import { useRouter } from 'vue-router';

const router = useRouter();
const appStore = useAppStore();
const nodes = ref<any[]>([]);
const edges = ref<any[]>([]);
const activeTaskNames = ref<string[]>([]);
const activeSignalNames = ref<string[]>([]);
const activeTaskCounts = ref<Record<string, number>>({});
const snapshotTaskCounts = ref<Record<string, number>>({});
const snapshotSignalNames = ref<string[]>([]);
let graphRefreshInterval: ReturnType<typeof setInterval> | null = null;

// Both maps are populated from the graph edge data after the graph loads.
const signalToEmitters = new Map<string, string[]>();
const signalToTriggers = new Map<string, string[]>();

// Signal-driven activity: tasks and signals flash active for 3s when a signal event arrives.
const flashingTasks = new Map<string, ReturnType<typeof setTimeout>>();
const flashingSignals = new Map<string, ReturnType<typeof setTimeout>>();

function rebuildActiveState() {
  const counts: Record<string, number> = { ...snapshotTaskCounts.value };
  for (const task of flashingTasks.keys()) {
    counts[task] = Math.max(counts[task] ?? 0, 1);
  }
  activeTaskCounts.value = counts;
  activeTaskNames.value = Object.keys(counts);
  activeSignalNames.value = [...new Set([...snapshotSignalNames.value, ...flashingSignals.keys()])];
}

function flashForSignal(signalName: string) {
  const tasks = [
    ...(signalToEmitters.get(signalName) ?? []),
    ...(signalToTriggers.get(signalName) ?? []),
  ];
  console.log('[hybrid] flashForSignal', signalName, '→ tasks:', tasks);
  for (const task of tasks) {
    const existing = flashingTasks.get(task);
    if (existing) clearTimeout(existing);
    flashingTasks.set(task, setTimeout(() => { flashingTasks.delete(task); rebuildActiveState(); }, 3000));
  }
  const existingSig = flashingSignals.get(signalName);
  if (existingSig) clearTimeout(existingSig);
  flashingSignals.set(signalName, setTimeout(() => { flashingSignals.delete(signalName); rebuildActiveState(); }, 3000));
  rebuildActiveState();
}

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

  // Build the set of service IDs we have nodes for; collect missing ones from task/routine references
  const serviceIds = new Set<string>((data.services ?? []).map((s: any) => s.name));
  const missingServiceIds = new Set<string>();
  for (const r of (data.routineMap ?? [])) {
    if (r.serviceName && !serviceIds.has(r.serviceName)) missingServiceIds.add(r.serviceName);
  }
  for (const task of (data.tasks ?? [])) {
    if (task.service && !serviceIds.has(task.service)) missingServiceIds.add(task.service);
  }
  for (const svcName of signalServiceMap.values()) {
    if (svcName && !serviceIds.has(svcName)) missingServiceIds.add(svcName);
  }

  for (const svc of (data.services ?? [])) {
    result.push({ id: svc.name, type: 'custom', nodeType: 'service', position: { x: 0, y: 0 }, data: { label: svc.name, service: true }, extent: 'parent', expandParent: true });
  }
  // Virtual service nodes for services that have tasks/routines but weren't in the API response
  for (const svcName of missingServiceIds) {
    result.push({ id: svcName, type: 'custom', nodeType: 'service', position: { x: 0, y: 0 }, data: { label: svcName, service: true }, extent: 'parent', expandParent: true });
    serviceIds.add(svcName);
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

function applyHybridGraph(data: any) {
  try {
    nodes.value = buildGraphNodes(data);

    // Build signal↔task maps for live activity flashing
    signalToEmitters.clear();
    signalToTriggers.clear();
    for (const e of (data.taskSignalEdges ?? [])) {
      if (!signalToEmitters.has(e.signalName)) signalToEmitters.set(e.signalName, []);
      signalToEmitters.get(e.signalName)!.push(e.taskName);
    }
    for (const e of (data.signalToTaskEdges ?? [])) {
      if (!signalToTriggers.has(e.signalName)) signalToTriggers.set(e.signalName, []);
      signalToTriggers.get(e.signalName)!.push(e.taskName);
    }

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
}

function applyActivitySnapshot(taskRows: any[], signalRows: any[]) {
  const taskCounts: Record<string, number> = {};
  for (const task of taskRows) {
    const name = String(task?.name ?? '');
    if (!name) {
      continue;
    }
    taskCounts[name] = (taskCounts[name] ?? 0) + 1;
  }

  snapshotTaskCounts.value = taskCounts;
  snapshotSignalNames.value = [...new Set(
    signalRows
      .map((signal) => String(signal?.name ?? ''))
      .filter(Boolean),
  )];
  rebuildActiveState();
}

const projectionState = useCadenzaProjectionState();
const runtimeReady = useCadenzaRuntimeReady();

appStore.setCurrentSection('home');

const { refresh } = await useAsyncData('hybrid-system-graph', async () => {
  const [graphResponse, activeTasksResponse, activeSignalsResponse] = await Promise.all([
    $fetch<any>('/api/system/graph'),
    $fetch<any>('/api/activity/tasks/activeTasks?limit=200'),
    $fetch<any>('/api/activity/signals/activeSignals'),
  ]);
  applyHybridGraph(graphResponse);
  applyActivitySnapshot(activeTasksResponse?.tasks ?? [], Array.isArray(activeSignalsResponse) ? activeSignalsResponse : []);
  return true;
});

watch(
  () => projectionState.value.projectionState.activityVersion,
  (_v, prev) => {
    if (prev === undefined) return;
    const signalName = projectionState.value.projectionState.lastSignalName;
    if (signalName) flashForSignal(signalName);
    refresh();
  },
);

watch(
  runtimeReady,
  (isReady) => {
    if (graphRefreshInterval) {
      clearInterval(graphRefreshInterval);
      graphRefreshInterval = null;
    }
    if (!isReady || !import.meta.client) {
      return;
    }
    graphRefreshInterval = setInterval(() => {
      refresh();
    }, 10000);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (graphRefreshInterval) clearInterval(graphRefreshInterval);
  for (const timer of flashingTasks.values()) clearTimeout(timer);
  for (const timer of flashingSignals.values()) clearTimeout(timer);
  flashingTasks.clear();
  flashingSignals.clear();
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
