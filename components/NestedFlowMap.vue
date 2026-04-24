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
    <div v-else-if="!loading && (displayedNodes || []).length === 0" class="no-data-overlay">
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
    <div class="zoom-slider" :class="{ 'dark-mode': $q?.dark?.isActive }" aria-hidden="false">
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
    </div>

    <VueFlow
      ref="vueFlowInstance"
      :nodes="displayedNodes || []"
      :edges="displayedEdges || []"
      @node-click="onNodeClick"
      :max-zoom="maxZoom"
      :min-zoom="minZoom"
      :zoom-on-scroll="false"
      fit-view-on-init
      contenteditable="false"
      :nodes-draggable="true"
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
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
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

const vueFlowInstance = ref(null);
const containerRef = ref(null);
const isFullscreen = ref(false);
const $q = useQuasar();

const fullscreenPolkaClass = computed(() => {
  if (!isFullscreen.value) return '';
  return $q?.dark?.isActive ? 'polka-dark' : 'polka-light';
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
  // Trigger full redraw with or without hierarchical structure
  updateLayout(props.nodes, props.edges);
});

watch([layoutDirection, layoutAlgorithm], () => {
  updateLayout(props.nodes, props.edges);
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

const elk = new ELK();

async function layoutFlatNodes(nodesArr, edgesArr) {
  const flatNodes = nodesArr.filter(
    (n) => n.nodeType === 'task' || n.nodeType === 'signal'
  );

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
      ...node,
    })),
    edges: (edgesArr || [])
      .filter((edge) => {
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

  const layouted = await elk.layout(elkGraph);

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

  // Collect all node IDs present in the ELK hierarchy so we can filter edges
  const elkHierarchyIds = new Set();
  elkServices.forEach((svc) => {
    elkHierarchyIds.add(svc.id);
    (svc.children || []).forEach((child) => {
      elkHierarchyIds.add(child.id);
      (child.children || []).forEach((gc) => elkHierarchyIds.add(gc.id));
    });
  });
  // Global signals (no service parent) placed as top-level ELK nodes
  const globalSignalNodes = signals
    .filter((s) => !s.parentNode)
    .map((s) => ({ id: s.id, width: 110, height: 50, ...s }));
  globalSignalNodes.forEach((s) => elkHierarchyIds.add(s.id));

  const elkEdges = edgesArr
    .filter((edge) => elkHierarchyIds.has(edge.source) && elkHierarchyIds.has(edge.target))
    .map((edge) => ({
      id: edge.id || `${edge.source}-${edge.target}`,
      sources: [edge.source],
      targets: [edge.target],
    }));

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
    children: [...elkServices, ...globalSignalNodes],
    edges: elkEdges,
  };

  const layouted = await elk.layout(elkGraph);

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
const filteredChain = ref(null);
let fullNodesBackup = [];
let fullEdgesBackup = [];
let fullNodes = [];
let fullEdges = [];
let filterChain = [];

async function updateLayout(newNodes, newEdges) {
  loading.value = true;
  try {
    let nodes = await layoutNodes(newNodes, newEdges);
    if (nodes.length === 0 && (newNodes || []).length > 0) {
      nodes = await layoutFlatNodes(newNodes, newEdges);
    }

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

        // Determine edge styling: signal or neutral
        let edgeClass = '';
        let edgeStyle = { strokeWidth: 2 };

        if (isSignal) {
          // Signal edges: use section color directly
          edgeStyle.stroke = sectionNodeBg.value;
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
          data: { ...(edge.data || {}), signal: isSignal },
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
  } catch (error) {
    console.error('Error in updateLayout:', error);
    try {
      const flatNodes = await layoutFlatNodes(newNodes, newEdges);
      const flatNodeIds = new Set(flatNodes.map((n) => n.id));
      const flatEdges = (newEdges || [])
        .filter((e) => flatNodeIds.has(e.source) && flatNodeIds.has(e.target))
        .map((e) => ({ ...e, animated: false }));
      laidOutNodes.value = flatNodes;
      laidOutEdges.value = flatEdges;
      fullNodes = flatNodes;
      fullEdges = flatEdges;
      displayedNodes.value = flatNodes;
      displayedEdges.value = flatEdges;
    } catch (fallbackError) {
      console.error('Fallback layout also failed:', fallbackError);
      displayedNodes.value = [];
      displayedEdges.value = [];
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
  if (!displayedNodes.value || displayedNodes.value.length === 0) return;
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

/* Edge colors */
.edge-neutral {
  --vue-flow-edge-stroke: #9E9E9E !important;
  --vue-flow-edge-stroke-selected: #9E9E9E !important;
}

.edge-signal {
  --vue-flow-edge-stroke: #2196F3 !important;
  --vue-flow-edge-stroke-selected: #2196F3 !important;
}
</style>
