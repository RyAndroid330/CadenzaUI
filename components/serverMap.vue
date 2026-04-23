<template>
  <div class="map-container q-ma-md">
    <div v-if="loading" class="text-center q-pa-md">Loading server map...</div>
    <div v-else-if="layoutedNodes.length === 0" class="text-center q-pa-md">
      No active servers found
    </div>
    <VueFlow
      v-else
      :nodes="layoutedNodes"
      :edges="edges"
      @node-click="onNodeClick"
      :fitViewOnInit="true"
      contenteditable="false"
      :nodes-draggable="false"
      v-bind="$attrs"
      :max-zoom="1.5"
      :min-zoom="0.1"
    >
      <template #node-customNode="{ data }">
        <div class="server-node" :style="{ background: nodeColor, borderColor: nodeColor }">
          <div class="server-node-label">{{ data.label }}</div>
          <div class="server-node-desc">{{ data.description }}</div>
        </div>
      </template>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import type { Node, Edge } from '@vue-flow/core';
import { VueFlow } from '@vue-flow/core';
import { ref, watch, computed } from 'vue';
import { colors } from 'quasar';
import { useAppStore } from '~/stores/app';

const props = defineProps<{
  nodes: Node[];
  edges: Edge[];
  loading: boolean;
}>();

const emit = defineEmits(['node-selected']);

const appStore = useAppStore();
const nodeColor = computed(() => {
  switch (appStore.currentSection) {
    case 'system':          return colors.getPaletteColor('primary');
    case 'serviceActivity': return colors.getPaletteColor('warning');
    case 'meta':            return colors.getPaletteColor('accent');
    case 'traces':          return colors.getPaletteColor('secondary');
    default:                return colors.getPaletteColor('warning');
  }
});

const layoutedNodes = ref<Node[]>([]);

watch(
  () => props.nodes,
  (newNodes) => {
    const cols = Math.ceil(Math.sqrt(newNodes.length)) || 1;
    layoutedNodes.value = newNodes.map((node, i) => ({
      ...node,
      position: { x: (i % cols) * 220, y: Math.floor(i / cols) * 100 },
    }));
  },
  { immediate: true, deep: true }
);

function onNodeClick({ node }: { event: any; node: Node }) {
  emit('node-selected', node.id);
}
</script>

<style>
@import '@vue-flow/core/dist/style.css';

.map-container {
  position: relative;
  min-width: 35dvw;
  max-width: 80dvw;
  height: 55dvh;
  box-shadow: 0 1px 6px 0 rgba(105, 105, 105, 0.5);
  border-radius: 20px;
  margin: 10px;
  background: rgba(255, 255, 255, 0.082);
}

.server-node {
  color: white;
  border-radius: 6px;
  padding: 8px 14px;
  border: 1px solid;
  min-width: 140px;
  text-align: center;
  cursor: pointer;
}

.server-node-label {
  font-weight: 600;
  font-size: 13px;
}

.server-node-desc {
  font-size: 11px;
  opacity: 0.85;
  margin-top: 2px;
}
</style>
