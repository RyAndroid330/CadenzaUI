<template>
  <div ref="containerRef" :class="['vue-flow-container q-mb-md', { 'fullscreen-mode': isFullscreen }, fullscreenPolkaClass]">
    <div v-if="filtered" class="back-btn-container">
      <q-btn
        round
        dense
        icon="arrow_back"
        color="primary"
        @click="resetFilter"
        class="back-btn"
      />
    </div>
    <div v-if="loading" class="loading-center-container">
      <q-spinner :color="sectionColor" size="10em" class="loading-spinner" />
      <q-badge
        outline
        :color="sectionColor"
        label="Loading Map ..."
        class="loading-badge"
      />
    </div>
    <div v-else-if="!loading && displayedNodes.length === 0" class="no-data-overlay">
      <q-icon 
        name="account_tree" 
        :color="sectionColor" 
        size="8em" 
        class="no-data-icon" 
      />
      <q-badge
        outline
        :color="sectionColor"
        label="Nothing to map"
        class="no-data-badge"
      />
    </div>
    <div class="zoom-slider" :class="{ 'dark-mode': $q.dark.isActive }" aria-hidden="false">
      <q-btn
        flat dense round
        icon="tune"
        :color="showLayoutSettings ? sectionColor : undefined"
        @click="showLayoutSettings = !showLayoutSettings"
        title="Layout Settings"
      />
      <template v-if="showLayoutSettings">
        <span class="zoom-label q-ml-xs">Dir</span>
        <q-btn-toggle
          v-model="layoutDirection"
          dense flat unelevated
          :toggle-color="sectionColor"
          :options="directionOptions"
          class="q-mx-xs"
        />
        <q-separator vertical inset class="q-mx-xs" />
        <span class="zoom-label">Style</span>
        <q-btn-toggle
          v-model="layoutAlgorithm"
          dense flat unelevated
          :toggle-color="sectionColor"
          :options="algorithmOptions"
          class="q-mx-xs"
        />
        <q-separator vertical inset class="q-mx-sm" />
      </template>
      <label class="zoom-label">Zoom</label>
      <input
        type="range"
        v-model.number="zoom"
        :min="minZoom"
        :max="maxZoom"
        step="0.01"
        aria-label="Zoom slider"
      />
      <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
      <q-btn
        flat
        dense
        round
        icon="fit_screen"
        @click="fitToWindow"
        class="q-ml-md"
        title="Fit to Window"
      />
      <q-btn
        flat
        dense
        round
        :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'"
        @click="toggleFullscreen"
        class="q-ml-xs"
        title="Toggle Fullscreen"
      />
      <q-checkbox
        v-model="hideServices"
        label="Hide Services"
        dense
        class="q-ml-md"
      />
      <!-- <q-checkbox
        v-model="hideRoutines"
        label="Hide Routines"
        dense
        class="q-ml-md"
      /> -->
      <q-checkbox
        v-model="trafficView"
        label="Traffic View"
        dense
        class="q-ml-md"
      />
      <q-btn
        v-if="trafficView"
        flat
        dense
        round
        icon="settings"
        @click="showTrafficSettings = true"
        class="q-ml-xs"
        title="Traffic Settings"
        size="sm"
      />
    </div>

    <!-- Traffic Settings Dialog -->
    <q-dialog v-model="showTrafficSettings" persistent>
      <q-card style="min-width: 450px; max-width: 500px">
        <q-card-section class="row items-center q-py-sm q-px-md">
          <div class="text-h6">Traffic Settings</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-sm">
          <div class="text-subtitle2 q-mb-md text-weight-medium">Time Filter</div>
          
          <!-- Time Period Filter -->
          <div class="q-mb-md">
            <q-select
              v-model="timePeriod"
              :options="timePeriodOptions"
              label="Period"
              emit-value
              map-options
              dense
              class="q-mb-sm"
            />
            <q-input
              v-if="timePeriod !== 'all'"
              v-model.number="timeValue"
              type="number"
              :label="`# of ${timePeriod}s`"
              :min="1"
              :max="timePeriod === 'hour' ? 24 : timePeriod === 'day' ? 365 : 10"
              dense
            />
          </div>

          <div class="text-subtitle2 q-mb-md text-weight-medium">Color Thresholds</div>
          
          <!-- Low Traffic Threshold -->
          <div class="q-mb-sm">
            <div class="text-caption q-mb-xs text-green-8">Low (Green)</div>
            <q-slider
              v-model="trafficThresholds.low"
              :min="1"
              :max="trafficThresholds.medium - 1"
              :step="1"
              label
              color="green"
              track-color="grey-3"
              dense
            />
            <div class="text-center text-caption text-green-8">{{ trafficThresholds.low }}</div>
          </div>

          <!-- Medium Traffic Threshold -->
          <div class="q-mb-sm">
            <div class="text-caption q-mb-xs text-orange-8">Medium (Yellow)</div>
            <q-slider
              v-model="trafficThresholds.medium"
              :min="trafficThresholds.low + 1"
              :max="trafficThresholds.high - 1"
              :step="1"
              label
              color="orange"
              track-color="grey-3"
              dense
            />
            <div class="text-center text-caption text-orange-8">{{ trafficThresholds.medium }}</div>
          </div>

          <!-- High Traffic Threshold -->
          <div class="q-mb-sm">
            <div class="text-caption q-mb-xs text-deep-orange-8">High (Orange)</div>
            <q-slider
              v-model="trafficThresholds.high"
              :min="trafficThresholds.medium + 1"
              :max="10000"
              :step="1"
              label
              color="deep-orange"
              track-color="grey-3"
              dense
            />
            <div class="text-center text-caption text-deep-orange-6">{{ trafficThresholds.high }}</div>
          </div>
          <div>
            <div class="text-caption q-mb-xs text-red-8">Extreme (Red)</div>
          </div>
        </q-card-section>

        <q-card-actions class="q-pa-sm">
          <q-btn flat dense label="Reset" color="primary" @click="resetTrafficThresholds" />
          <q-space />
          <q-btn flat dense label="Cancel" v-close-popup />
          <q-btn dense label="Apply" color="primary" @click="applyTrafficSettings" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <VueFlow
      ref="vueFlowInstance"
      :nodes="displayedNodes"
      :edges="displayedEdges"
      @node-click="onNodeClick"
      @edge-mouse-enter="handleEdgeHover"
      @edge-mouse-leave="handleEdgeUnhover"
      :max-zoom="maxZoom"
      :min-zoom="minZoom"
      :zoom-on-scroll="false"
      fit-view-on-init
      contenteditable="false"
      :nodes-draggable="false"
    >
      <template #node-custom="nodeProps">
        <CustomNode
          :data="{ ...nodeProps.data, uuid: nodeProps.id, sectionNodeBg: sectionNodeBg, hideContainer: hideServices }"
          @node-hover="handleNodeHover"
          @node-unhover="handleNodeUnhover"
        />
      </template>
      <MiniMap v-if="showMiniMap" />
    </VueFlow>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import { VueFlow } from '@vue-flow/core';
import { MiniMap } from '@vue-flow/minimap';
import ELK from 'elkjs/lib/elk.bundled.js';
import CustomNode from '~/components/CustomNode.vue';
import { useAppStore } from '~/stores/app';
import { colors, useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

const resetFilter = () => {
  loading.value = true;
  displayedNodes.value = [];
  displayedEdges.value = [];
  hoveredEdgeId.value = null;
  updateLayout(props.nodes, props.edges);
  filtered.value = false;
};

const emit = defineEmits(['item-selected']);

const onNodeClick = (...args) => {
  const maybeEvent = args[0];
  const maybeNode = args[1];
  const payload = maybeNode || (maybeEvent && maybeEvent.node) || maybeEvent;
  const clickedNode = payload || null;
  if (!clickedNode) return;

  if (clickedNode.nodeType === 'service') {
    const serviceChain = [];
    const visited = new Set();
    const queue = [clickedNode.id];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const serviceNode = fullNodes.find(
        (n) => n.id === currentId && n.nodeType === 'service'
      );
      if (serviceNode) {
        serviceChain.push(serviceNode);
        const nextEdges = fullEdges.filter(
          (e) =>
            e.source === currentId &&
            fullNodes.find((n) => n.id === e.target && n.nodeType === 'service')
        );
        for (const edge of nextEdges) {
          if (!visited.has(edge.target)) {
            queue.push(edge.target);
          }
        }
      }
    }

    const idsToShow = new Set();
    for (const service of serviceChain) {
      idsToShow.add(service.id);
      const tasks = fullNodes.filter(
        (n) => n.nodeType === 'task' && n.parentNode === service.id
      );
      for (const task of tasks) {
        idsToShow.add(task.id);
      }
      const signals = fullNodes.filter(
        (n) => n.nodeType === 'signal' && n.parentNode === service.id
      );
      for (const sig of signals) idsToShow.add(sig.id);
    }
    displayedNodes.value = fullNodes.filter((n) => idsToShow.has(n.id));
    displayedEdges.value = fullEdges.filter(
      (e) => idsToShow.has(e.source) && idsToShow.has(e.target)
    );
    filtered.value = true;
    console.log('[NestedFlowMap] Filtered node IDs:', Array.from(idsToShow));
    emit('item-selected', clickedNode);
  }
  else if (clickedNode.nodeType === 'task') {
    emit('item-selected', clickedNode);
  } else if (clickedNode.nodeType === 'signal') {
    emit('item-selected', clickedNode);
  }
};

function getConnectedNodes(nodeId) {
  const connected = new Set();

  // Get all ancestors (backward traversal)
  const getAncestors = (id) => {
    const incomingEdges = displayedEdges.value.filter(e => e.target === id);
    incomingEdges.forEach(edge => {
      const sourceId = edge.source;
      if (!connected.has(sourceId)) {
        connected.add(sourceId);
        getAncestors(sourceId);
      }
    });
  };

  // Get all descendants (forward traversal)
  const getDescendants = (id) => {
    const outgoingEdges = displayedEdges.value.filter(e => e.source === id);
    outgoingEdges.forEach(edge => {
      const targetId = edge.target;
      if (!connected.has(targetId)) {
        connected.add(targetId);
        getDescendants(targetId);
      }
    });
  };

  getAncestors(nodeId);
  getDescendants(nodeId);

  return connected;
}

function handleNodeHover(nodeId) {
  hoveredNodeId.value = nodeId;
  updateNodeStates();
}

function handleNodeUnhover() {
  hoveredNodeId.value = null;
  updateNodeStates();
}

function handleEdgeHover(event) {
  hoveredEdgeId.value = event.edge.id;
  updateEdgeStates();
}

function handleEdgeUnhover() {
  hoveredEdgeId.value = null;
  updateEdgeStates();
}

function updateNodeStates() {
  const hovered = hoveredNodeId.value;
  const chainNodeIds = hovered ? getConnectedNodes(hovered) : new Set();

  displayedNodes.value = displayedNodes.value.map(node => ({
    ...node,
    data: {
      ...node.data,
      isHovered: node.id === hovered,
      isInChain: chainNodeIds.has(node.id),
    },
  }));
}

function updateEdgeStates() {
  const hoveredEdge = hoveredEdgeId.value;
  const traffic = hoveredEdge ? displayedEdges.value.find(e => e.id === hoveredEdge)?.data?.traffic || 0 : 0;

  displayedEdges.value = displayedEdges.value.map(edge => ({
    ...edge,
    label: (edge.id === hoveredEdge && traffic > 0) ? traffic.toString() : '',
  }));
}

const vueFlowInstance = ref(null);
const containerRef = ref(null);
const isFullscreen = ref(false);
const $q = useQuasar();

const fullscreenPolkaClass = computed(() => {
  if (!isFullscreen.value) return '';
  return $q && $q.dark.isActive ? 'polka-dark' : 'polka-light';
});

function fitToWindow() {
  if (!vueFlowInstance.value) return;
  const api = vueFlowInstance.value;
  if (typeof api.fitView === 'function') {
    try {
      api.fitView({ padding: 0.1, maxZoom: 1 });
    } catch (err) {
      console.error('Error fitting view:', err);
    }
  }
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  if (isFullscreen.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

const minZoom = 0.05;
const maxZoom = 5;
const zoom = ref(1);
const hideServices = ref(true);
const hideRoutines = ref(true);
const showLayoutSettings = ref(false);
const layoutDirection = ref('RIGHT');
const layoutAlgorithm = ref('layered');

const directionOptions = [
  { value: 'LEFT',  icon: 'arrow_back' },
  { value: 'RIGHT', icon: 'arrow_forward' },
  { value: 'UP',    icon: 'arrow_upward' },
  { value: 'DOWN',  icon: 'arrow_downward' },
];

const algorithmOptions = [
  { value: 'layered',     label: 'Layered' },
  { value: 'stress',      label: 'Stress' },
  { value: 'force',       label: 'Force' },
  { value: 'mrtree',      label: 'Tree' },
  { value: 'rectpacking', label: 'Pack' },
];

const trafficView = ref(true); // TEMPORARY: Enable by default for testing
const showTrafficSettings = ref(false);

// Time filter refs
const timePeriod = ref('all');
const timeValue = ref(1);
const timePeriodOptions = [
  { label: 'All', value: 'all' },
  { label: 'Hour', value: 'hour' },
  { label: 'Day', value: 'day' },
  { label: 'Year', value: 'year' }
];

// Traffic thresholds with reactive refs
const trafficThresholds = ref({
  low: 50,    // 1 to low-1 = green
  medium: 200, // low to medium-1 = yellow
  high: 1000   // medium to high-1 = orange, high+ = red
});

// Default thresholds for reset
const defaultTrafficThresholds = {
  low: 50,
  medium: 200,
  high: 1000
};

function resetTrafficThresholds() {
  trafficThresholds.value = { ...defaultTrafficThresholds };
  // Apply the reset thresholds immediately
  applyTrafficSettings();
}

function applyTrafficSettings() {
  // Close dialog and trigger layout update
  showTrafficSettings.value = false;
  updateLayout(props.nodes, props.edges);
}

watch(zoom, async (val) => {
  if (!vueFlowInstance.value) return;
  const api = vueFlowInstance.value;
  if (api && typeof api.zoomTo === 'function') {
    try {
      await api.zoomTo(val);
    } catch (err) {
    }
  } else if (api && typeof api.setViewport === 'function') {
    try {
      await api.setViewport({ x: 0, y: 0, zoom: val });
    } catch (err) {
    }
  }
});

watch(hideServices, () => {
  updateLayout(props.nodes, props.edges);
});

watch([layoutDirection, layoutAlgorithm], () => {
  updateLayout(props.nodes, props.edges);
});

// Watch traffic view toggle to update edge colors
watch(trafficView, () => {
  displayedEdges.value = displayedEdges.value.map(edge => {
    const traffic = edge.data?.traffic || 0;
    const isSignal = edge.data?.signal || false;

    let edgeClass = '';
    let edgeStyle = { strokeWidth: 2 };

    if (trafficView.value && traffic > 0) {
      // Traffic view enabled: use traffic color classes
      if (traffic === 0) {
        edgeClass = 'edge-traffic-neutral';
      } else if (traffic < trafficThresholds.value.low) {
        edgeClass = 'edge-traffic-low';
      } else if (traffic < trafficThresholds.value.medium) {
        edgeClass = 'edge-traffic-medium';
      } else if (traffic < trafficThresholds.value.high) {
        edgeClass = 'edge-traffic-high';
      } else {
        edgeClass = 'edge-traffic-max';
      }
    } else if (isSignal) {
      // Signal edges: use section color directly
      edgeStyle.stroke = sectionNodeBg.value;
      edgeClass = 'edge-signal';
    } else {
      // Non-signal edges: use neutral class
      edgeClass = 'edge-neutral';
    }

    return {
      ...edge,
      class: edgeClass,
      style: edgeStyle,
    };
  });
});

watch(hideRoutines, () => {
  // Toggle routine visibility by updating the routine flag in all displayed nodes
  displayedNodes.value = displayedNodes.value.map((node) => {
    if (node.nodeType === 'routine') {
      return {
        ...node,
        data: { ...node.data, routine: hideRoutines.value }
      };
    }
    return node;
  });
  // Reapply hover states after updating visibility
  if (hoveredNodeId.value) {
    updateNodeStates();
  }
});

onMounted(async () => {
  typeof onNodeClick;
  await nextTick();
  if (!vueFlowInstance.value) return;
  try {
    const vp = typeof vueFlowInstance.value.getViewport === 'function' ? await vueFlowInstance.value.getViewport() : null;
    if (vp && typeof vp.zoom === 'number') {
      zoom.value = vp.zoom;
    }
  } catch (err) {
  }

  const keyHandler = (ev) => {
    if (ev.code === 'Space') {
      // If filter is active, restore regardless of hover state
      if (filteredChain.value) {
        ev.preventDefault();
        // Restore full node/edge list
        displayedNodes.value = fullNodesBackup;
        displayedEdges.value = fullEdgesBackup;
        filteredChain.value = null;
        fullNodesBackup = [];
        fullEdgesBackup = [];
        updateNodeStates();
        updateEdgeStates();
        return;
      }

      // If hovering, create filter
      if (hoveredNodeId.value) {
        ev.preventDefault();
        // Store current state and filter to chain
        const chainNodeIds = getConnectedNodes(hoveredNodeId.value);
        chainNodeIds.add(hoveredNodeId.value); // Include the hovered node

        // Backup current nodes/edges
        fullNodesBackup = [...displayedNodes.value];
        fullEdgesBackup = [...displayedEdges.value];

        // Filter edges to only those within the chain
        const chainEdgeIds = new Set();
        displayedEdges.value.forEach(edge => {
          if (chainNodeIds.has(edge.source) && chainNodeIds.has(edge.target)) {
            chainEdgeIds.add(edge.id);
          }
        });

        // Store filtered chain info
        filteredChain.value = { nodeIds: chainNodeIds, edgeIds: chainEdgeIds };

        // Apply filter
        displayedNodes.value = displayedNodes.value.filter(node => chainNodeIds.has(node.id));
        displayedEdges.value = displayedEdges.value.filter(edge => chainEdgeIds.has(edge.id));
        updateNodeStates();
        updateEdgeStates();
      }
    }
  };

  window.addEventListener('keydown', keyHandler);

  onUnmounted(() => {
    window.removeEventListener('keydown', keyHandler);
  });
});

const props = defineProps({
  nodes: {
    type: Array,
    required: true,
    default: () => [],
  },
  edges: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const appStore = useAppStore();
const currentSection = computed(() => appStore.currentSection);
const router = useRouter();
const sectionColor = computed(() => {
  switch (currentSection.value) {
    case 'system':
      return 'primary';
    case 'serviceActivity':
      return 'warning';
    case 'traces':
      return 'secondary';
    case 'meta':
      return 'accent';
    case 'help':
      return 'grey-8';
    default:
      return 'secondary';
  }
});
const sectionNodeBg = computed(() => {
  switch (currentSection.value) {
    case 'system':
      return colors.changeAlpha(colors.getPaletteColor('primary'), 0.6);
    case 'serviceActivity':
      return colors.changeAlpha(colors.getPaletteColor('warning'), 0.6);
    case 'traces':
      return colors.changeAlpha(colors.getPaletteColor('secondary'), 0.6);
    case 'meta':
      return colors.changeAlpha(colors.getPaletteColor('accent'), 0.6);
    case 'help':
      return colors.changeAlpha(colors.getPaletteColor('grey-8'), 0.6);
    default:
      return colors.changeAlpha(colors.getPaletteColor('secondary'), 0.6);
  }
});

function getTrafficColor(traffic) {
  // Green for 0-50
  if (traffic <= 50) {
    return '#4CAF50'; // Green
  }
  // Yellow to orange for 51-75
  else if (traffic <= 75) {
    const t = (traffic - 50) / 25; // 0 to 1
    // Interpolate from yellow (#FFC107) to orange (#FF9800)
    return `rgb(255, ${Math.round(193 - 41 * t)}, ${Math.round(7 - 7 * t)})`;
  }
  // Orange to red for 76-100
  else {
    const t = (traffic - 75) / 25; // 0 to 1
    // Interpolate from orange (#FF9800) to red (#F44336)
    return `rgb(${Math.round(255 - 11 * t)}, ${Math.round(152 - 85 * t)}, ${Math.round(0 + 54 * t)})`;
  }
}

const elk = new ELK();

async function layoutFlatNodes(nodesArr, edgesArr) {
  const flatNodes = nodesArr.filter(
    (n) => n.nodeType === 'task' || n.nodeType === 'signal'
  );

  if (flatNodes.length === 0) return [];

  const flatOpts = {
    'elk.algorithm': layoutAlgorithm.value,
    'elk.spacing.nodeNode': '60',
  };
  if (['layered', 'mrtree'].includes(layoutAlgorithm.value)) {
    flatOpts['elk.direction'] = layoutDirection.value;
  }
  if (layoutAlgorithm.value === 'layered') {
    flatOpts['elk.layered.spacing.edgeNodeBetweenLayers'] = '30';
    flatOpts['elk.layered.nodePlacement.strategy'] = 'SIMPLE';
  } else if (layoutAlgorithm.value === 'stress') {
    flatOpts['elk.stress.desiredEdgeLength'] = '180';
    flatOpts['elk.stress.iterationLimit'] = '100';
  } else if (layoutAlgorithm.value === 'force') {
    flatOpts['elk.force.iterations'] = '100';
  } else if (layoutAlgorithm.value === 'rectpacking') {
    flatOpts['elk.rectpacking.aspectRatio'] = '2.5';
  }
  const elkGraph = {
    id: 'root',
    layoutOptions: flatOpts,
    children: flatNodes.map((node) => ({
      id: node.id,
      width: node.nodeType === 'signal' ? 110 : 70,
      height: node.nodeType === 'signal' ? 50 : 40,
    })),
    edges: edgesArr
      .filter((edge) => {
        if (!edge.source || !edge.target) return false;
        const sourceNode = flatNodes.find((n) => n.id === edge.source);
        const targetNode = flatNodes.find((n) => n.id === edge.target);
        return sourceNode && targetNode;
      })
      .map((edge) => ({
        id: edge.id || `${edge.source}-${edge.target}`,
        sources: [edge.source],
        targets: [edge.target],
      })),
  };

  let layouted;
  try {
    layouted = await elk.layout(elkGraph);
  } catch (e) {
    console.error('ELK layout error, falling back to grid:', e);
    return flatNodes.map((node, i) => ({
      ...node,
      position: { x: (i % 8) * 160, y: Math.floor(i / 8) * 100 },
      width: node.nodeType === 'signal' ? 110 : 70,
      height: node.nodeType === 'signal' ? 50 : 40,
    }));
  }

  return (layouted.children || []).map((layoutNode) => {
    const originalNode = flatNodes.find((n) => n.id === layoutNode.id);
    return {
      ...originalNode,
      position: { x: layoutNode.x ?? 0, y: layoutNode.y ?? 0 },
      width: layoutNode.width,
      height: layoutNode.height,
    };
  });
}

async function layoutNodes(nodesArr, edgesArr) {
  // If hideServices is true, layout in flat mode (no hierarchy)
  if (hideServices.value) {
    return layoutFlatNodes(nodesArr, edgesArr);
  }

  const services = nodesArr.filter((n) => n.nodeType === 'service');
  const routines = nodesArr.filter((n) => n.nodeType === 'routine');
  const tasks = nodesArr.filter((n) => n.nodeType === 'task');
  const signals = nodesArr.filter((n) => n.nodeType === 'signal');

  const elkServices = services.map((service) => {
    const serviceDirectTasks = tasks
      .filter((t) => t.parentNode === service.id)
      .map((task) => ({ id: task.id, width: 70, height: 40, ...task }));

    const elkChildren = [
      ...serviceDirectTasks,
      ...routines
        .filter((r) => r.parentNode === service.id)
        .map((routine) => {
          const elkTasks = tasks
            .filter((t) => t.parentNode === routine.id)
            .map((task) => ({
              id: task.id,
              width: 70,
              height: 40,
              ...task,
            }));

          return {
            id: routine.id,
            width: Math.max(400, elkTasks.length * 80),
            height: Math.max(250, elkTasks.length * 50),
            ...routine,
            children: elkTasks,
            layoutOptions: {
              'elk.padding': '[top=60,left=60,bottom=60,right=60]',
              'elk.spacing.nodeNode': '40',
              'elk.align': 'CENTER',
            },
          };
        }),
      ...signals
        .filter((s) => s.parentNode === service.id)
        .map((signal) => {
          const elkTasks = tasks
            .filter((t) => t.parentNode === signal.id)
            .map((task) => ({
              id: task.id,
              width: 70,
              height: 40,
              ...task,
            }));

          return {
            id: signal.id,
            width: Math.max(110, elkTasks.length * 80),
            height: Math.max(50, elkTasks.length * 50),
            ...signal,
            children: elkTasks,
            layoutOptions: {
              'elk.padding': '[top=60,left=60,bottom=60,right=60]',
              'elk.spacing.nodeNode': '60',
              'elk.align': 'CENTER',
            },
          };
        }),
    ];

    console.log('[ELK Layout] Service children:', elkChildren);

    return {
      id: service.id,
      width: Math.max(600, elkChildren.length * 100),
      height: Math.max(350, elkChildren.length * 80),
      ...service,
      children: elkChildren,
      layoutOptions: {
        'elk.padding': '[top=60,left=30,bottom=30,right=30]',
        'elk.spacing.nodeNode': '40',
        'elk.align': 'CENTER',
      },
    };
  });

  const elkEdges = edgesArr
    .map((edge) => {
      const sourceNode = nodesArr.find((n) => n.id === edge.source);
      const targetNode = nodesArr.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) {
        console.warn('[ELK Layout] Skipping edge due to missing nodes:', {
          edge,
          missingSource: !sourceNode,
          missingTarget: !targetNode,
        });
        return null;
      }

      const isSignalEdge = Boolean(
        (sourceNode.nodeType === 'signal') ||
        (targetNode.nodeType === 'signal') ||
        (sourceNode.signal) ||
        (targetNode.signal) ||
        (edge.data && edge.data.signal)
      );

      // Traffic will be set later in updateLayout
      const traffic = edge.data?.traffic || 0;

      // Determine edge styling based on traffic view
      let edgeClass = '';
      let edgeStyle = { strokeWidth: 2 };

      if (trafficView.value && traffic > 0) {
        // Traffic view enabled: use traffic color classes
        if (traffic === 0) {
          edgeClass = 'edge-traffic-neutral';
        } else if (traffic < trafficThresholds.value.low) {
          edgeClass = 'edge-traffic-low';
        } else if (traffic < trafficThresholds.value.medium) {
          edgeClass = 'edge-traffic-medium';
        } else if (traffic < trafficThresholds.value.high) {
          edgeClass = 'edge-traffic-high';
        } else {
          edgeClass = 'edge-traffic-max';
        }
      } else if (isSignalEdge) {
        // Signal edges: use section color directly
        edgeStyle.stroke = sectionNodeBg.value;
      } else {
        // Non-signal edges: use neutral class
        edgeClass = 'edge-neutral';
      }

      return {
        id: edge.id || `${edge.source}-${edge.target}`,
        sources: [edge.source],
        targets: [edge.target],
        type: edge.type || 'default',
        class: edgeClass,
        style: edgeStyle,
        data: { ...(edge.data || {}), signal: isSignalEdge, traffic },
        animated: true,
        ...edge,
      };
    })
    .filter(Boolean);

  const hierOpts = {
    'elk.algorithm': layoutAlgorithm.value,
    'elk.spacing.nodeNode': '80',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  };
  if (['layered', 'mrtree'].includes(layoutAlgorithm.value)) {
    hierOpts['elk.direction'] = layoutDirection.value;
    hierOpts['elk.layered.spacing.nodeNodeBetweenLayers'] = '80';
  } else if (layoutAlgorithm.value === 'stress') {
    hierOpts['elk.stress.desiredEdgeLength'] = '200';
    hierOpts['elk.stress.iterationLimit'] = '100';
  } else if (layoutAlgorithm.value === 'force') {
    hierOpts['elk.force.iterations'] = '100';
  } else if (layoutAlgorithm.value === 'rectpacking') {
    hierOpts['elk.rectpacking.aspectRatio'] = '2.5';
  }
  const elkGraph = {
    id: 'root',
    layoutOptions: hierOpts,
    children: [...elkServices],
    edges: elkEdges,
  };

  console.log('[ELK Graph Structure]:', elkGraph);

  const layouted = await elk.layout(elkGraph);

  console.log('[ELK Layout Result]:', layouted);

  function flattenNodes(elkNode) {
    let flat = [];
    if (elkNode.children) {
      elkNode.children.forEach((child) => {
        flat = flat.concat(flattenNodes(child));
      });
    }
    if (elkNode.id !== 'root') {
      const originalNode = nodesArr.find((n) => n.id === elkNode.id);
      flat.push({
        ...originalNode,
        position: { x: elkNode.x, y: elkNode.y },
        width: elkNode.width,
        height: elkNode.height,
        data: {
          ...originalNode.data,
          service: originalNode.nodeType === 'service',
          routine: originalNode.nodeType === 'routine',
        },
      });
    }
    return flat;
  }
  return flattenNodes(layouted);
}

const laidOutNodes = ref([]);
const laidOutEdges = ref([]);
const loading = ref(false);
const filtered = ref(false);
const displayedNodes = ref([]);
const displayedEdges = ref([]);
const hoveredNodeId = ref(null);
const hoveredEdgeId = ref(null);
const filteredChain = ref(null);
let fullNodesBackup = [];
let fullEdgesBackup = [];
let fullNodes = [];
let fullEdges = [];
let filterChain = [];

async function fetchTrafficData(edges, nodes) {
  if (!edges || edges.length === 0) return {};

  try {
    const trafficRequest = {
      edges: edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceType: sourceNode?.nodeType,
          targetType: targetNode?.nodeType,
          sourceName: sourceNode?.data?.label || sourceNode?.data?.taskName,
          targetName: targetNode?.data?.label || targetNode?.data?.taskName,
          sourceService: sourceNode?.data?.service_name,
          targetService: targetNode?.data?.service_name,
        };
      }),
      // Add time filter
      timeFilter: timePeriod.value === 'all' ? null : {
        period: timePeriod.value,
        value: timeValue.value
      }
    };

    const response = await fetch('/api/system/traffic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trafficRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const trafficMap = {};
    data.traffic.forEach(item => {
      trafficMap[item.edgeId] = item.traffic;
    });

    return trafficMap;
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    // Return empty traffic map as fallback
    return {};
  }
}

async function updateLayout(newNodes, newEdges) {
  loading.value = true;
  try {
    const nodes = await layoutNodes(newNodes, newEdges);

    // Fetch real traffic data (pass nodes for node lookup)
    const trafficData = await fetchTrafficData(newEdges || [], nodes);

    // If hiding services, filter edges to only show connections between displayed nodes
    const displayedNodeIds = new Set(nodes.map((n) => n.id));

    const edges = (newEdges || [])
      .filter((edge) => {
        // In flat mode, only show edges where both nodes are displayed
        if (hideServices.value) {
          return displayedNodeIds.has(edge.source) && displayedNodeIds.has(edge.target);
        }
        return true;
      })
      .map((edge) => {
        if (!edge.source || !edge.target) {
          console.warn('[updateLayout] Edge skipped due to missing source or target:', {
            edge,
            reason: {
              missingSource: !edge.source,
              missingTarget: !edge.target,
            },
          });
          return null;
        }

        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        // Skip edges where source or target is not in the displayed nodes
        if (!sourceNode || !targetNode) {
          return null;
        }

        const isSignal = Boolean(
          (sourceNode && (sourceNode.nodeType === 'signal' || (sourceNode.data && sourceNode.data.signal))) ||
          (targetNode && (targetNode.nodeType === 'signal' || (targetNode.data && targetNode.data.signal))) ||
          (edge.data && edge.data.signal)
        );

        // Use real traffic data or fallback to 0 (no traffic)
        const traffic = trafficData[edge.id] || edge.data?.traffic || 0;

        // Determine edge styling based on traffic view
        let edgeClass = '';
        let edgeStyle = { strokeWidth: 2 };

        if (trafficView.value && traffic > 0) {
          // Traffic view enabled: use traffic color classes
          if (traffic === 0) {
            edgeClass = 'edge-traffic-neutral';
          } else if (traffic < trafficThresholds.value.low) {
            edgeClass = 'edge-traffic-low';
          } else if (traffic < trafficThresholds.value.medium) {
            edgeClass = 'edge-traffic-medium';
          } else if (traffic < trafficThresholds.value.high) {
            edgeClass = 'edge-traffic-high';
          } else {
            edgeClass = 'edge-traffic-max';
          }
        } else if (isSignal) {
          // Signal edges: use section color directly
          edgeStyle.stroke = sectionNodeBg.value;
          edgeClass = 'edge-signal';
        } else {
          // Non-signal edges: use neutral class
          edgeClass = 'edge-neutral';
        }

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'default',
          class: edgeClass,
          style: edgeStyle,
          data: { ...(edge.data || {}), signal: isSignal, traffic },
          animated: false,
          ...edge,
        };
      }).filter(Boolean);
    laidOutNodes.value = nodes;
    laidOutEdges.value = edges;
    fullNodes = nodes;
    fullEdges = edges;
    displayedNodes.value = nodes;
    displayedEdges.value = edges;

    // Update edge states after layout
    updateEdgeStates();

    // Reapply hover states after layout update
    if (hoveredNodeId.value) {
      updateNodeStates();
    }

    await nextTick();
    if (
      vueFlowInstance.value &&
      typeof vueFlowInstance.value.fitView === 'function'
    ) {
      vueFlowInstance.value.fitView({
        padding: 0,
        includeHiddenNodes: true,
        direction: 'horizontal',
      });
    }
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.nodes, props.edges],
  ([newNodes, newEdges]) => {
    updateLayout(newNodes, newEdges);
    filtered.value = false;
  },
  { immediate: true, deep: true }
);

const showMiniMap = ref(false);

function checkShowMiniMap() {
  const minX = Math.min(...displayedNodes.value.map((n) => n.position.x));
  const maxX = Math.max(...displayedNodes.value.map((n) => n.position.x));
  const minY = Math.min(...displayedNodes.value.map((n) => n.position.y));
  const maxY = Math.max(...displayedNodes.value.map((n) => n.position.y));
  const mapWidth = maxX - minX;
  const mapHeight = maxY - minY;
  const container = document.querySelector('.vue-flow-container');
  if (!container) return;
  const viewportWidth = container.offsetWidth;
  const viewportHeight = container.offsetHeight;

  showMiniMap.value = mapWidth > viewportWidth || mapHeight > viewportHeight;
}

watch([displayedNodes, displayedEdges], () => {
  checkShowMiniMap();
});

onMounted(() => {
  checkShowMiniMap();
});
</script>

<style>
.vue-flow-container {
  position: relative;
  min-width: 50dvw;
  max-width: 80dvw;
  height: 50dvh;
  box-shadow: 0 1px 6px 0 rgba(105, 105, 105, 0.5);
  border-radius: 20px;
  margin: 10px;
}

.loading-center-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  min-height: 300px;
  min-width: 300px;
}
.loading-spinner {
  margin-bottom: 24px;
}
.loading-badge {
  font-size: 1.2em;
}
.no-data-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  z-index: 5;
}
.no-data-icon {
  margin-bottom: 24px;
  opacity: 0.6;
}
.no-data-badge {
  font-size: 1.2em;
}
.back-btn-container {
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 10;
}
.back-btn {
  min-width: 80px;
}
.zoom-slider {
  position: absolute;
  top: 10px;
  right: 60px;
  background: rgba(255, 255, 255, 0.94);
  padding: 6px 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
  z-index: 12;
}
.zoom-slider.dark-mode {
  background: rgba(30, 30, 30, 0.94);
}
.zoom-slider .zoom-label {
  font-size: 12px;
  color: #444;
}
.zoom-slider.dark-mode .zoom-label {
  color: #bbb;
}
.zoom-slider input[type="range"] {
  width: 120px;
}
.zoom-slider .zoom-value {
  font-size: 12px;
  color: #333;
  min-width: 36px;
  text-align: right;
}
.zoom-slider.dark-mode .zoom-value {
  color: #aaa;
}
:deep(.zoom-slider .q-btn) {
  color: #444;
}
:deep(.zoom-slider.dark-mode .q-btn) {
  color: #bbb;
}

.vue-flow-container.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw !important;
  height: 100vh !important;
  min-width: 100vw !important;
  max-width: 100vw !important;
  min-height: 100vh !important;
  max-height: 100vh !important;
  margin: 0;
  border-radius: 0;
  z-index: 9999;
  background-attachment: fixed;
  background-position: center;
}

.vue-flow-container.polka-light {
  background-image: radial-gradient(rgb(168, 167, 167) 5%, transparent 5%);
  background-position: 4px 4px;
  background-size: 19px 19px;
  background-color: rgb(255, 255, 255);
}

.vue-flow-container.polka-dark {
  background-image: radial-gradient(rgb(87, 87, 87) 5%, transparent 5%);
  background-position: 4px 4px;
  background-size: 19px 19px;
  background-color: rgb(0, 0, 0);
}

/* Edge color classes - Global styles to override VueFlow defaults */
.vue-flow__edge.edge-traffic-low .vue-flow__edge-path {
  stroke: #4CAF50 !important; /* Green */
}

.vue-flow__edge.edge-traffic-medium .vue-flow__edge-path {
  stroke: #FFC107 !important; /* Yellow */
}

.vue-flow__edge.edge-traffic-high .vue-flow__edge-path {
  stroke: #FF9800 !important; /* Orange */
}

.vue-flow__edge.edge-traffic-max .vue-flow__edge-path {
  stroke: #F44336 !important; /* Red */
}

.vue-flow__edge.edge-neutral .vue-flow__edge-path {
  stroke: #9E9E9E !important; /* Gray */
}

/* Edge label styles */
.vue-flow__edge-label {
  font-size: 10px;
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 3px;
  border: 1px solid;
}

/* Traffic-based label colors */
.vue-flow__edge.edge-traffic-low .vue-flow__edge-label {
  fill: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
  border-color: #4CAF50;
}

.vue-flow__edge.edge-traffic-medium .vue-flow__edge-label {
  fill: #FFC107;
  background: rgba(255, 193, 7, 0.1);
  border-color: #FFC107;
}

.vue-flow__edge.edge-traffic-high .vue-flow__edge-label {
  fill: #FF9800;
  background: rgba(255, 152, 0, 0.1);
  border-color: #FF9800;
}

.vue-flow__edge.edge-traffic-max .vue-flow__edge-label {
  fill: #F44336;
  background: rgba(244, 67, 54, 0.1);
  border-color: #F44336;
}

.vue-flow__edge.edge-neutral .vue-flow__edge-label {
  fill: #9E9E9E;
  background: rgba(158, 158, 158, 0.1);
  border-color: #9E9E9E;
}

.vue-flow__edge.edge-signal .vue-flow__edge-label {
  fill: #333;
  background: rgba(255, 255, 255, 0.9);
  border-color: #666;
}

.vue-flow__edge-labels {
  pointer-events: none;
}
</style>
