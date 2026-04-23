<template>
  <q-timeline layout="comfortable" style="max-width: 97%">
    <q-timeline-entry
      v-for="(entry, index) in dedupedItems"
      :key="String(entry.uuid ?? index)"
      :title="entry.label"
      :subtitle="formatDate(entry.started)"
      :side="(entry.layer_index ?? 0) % 2 === 0 ? 'left' : 'right'"
      :style="{
        backgroundColor:
          entry.timelineType === 'heading'
            ? 'rgba(0, 123, 255, 0.10)'
            : (entry.layer_index ?? 0) % 2 === 0
            ? 'rgba(128, 128, 128, 0.1)'
            : '',
        borderLeft: entry.timelineType === 'heading' ? '4px solid #007bff' : '',
        fontWeight: entry.timelineType === 'heading' ? 'bold' : 'normal',
      }"
      @click="onEntrySelected(entry)"
    >
      <q-badge v-if="entry.type" color="blue-8" class="q-mb-sm">
        {{ String(entry.type).charAt(0).toUpperCase() + String(entry.type).slice(1) }}
      </q-badge>
      <q-badge v-else-if="entry.timelineType === 'heading'" color="blue-8" class="q-mb-sm">
        {{ entry.nodeType === 'service' ? 'Service' : 'Routine' }}
      </q-badge>
      <q-badge v-else-if="entry.description" color="primary">
        {{ entry.description }}
      </q-badge>
      <blockquote v-if="entry.inputContext">
        <pre>{{ JSON.stringify(entry.inputContext, null, 2) }}</pre>
      </blockquote>
    </q-timeline-entry>
  </q-timeline>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface TimelineEntry {
  label: string;
  started?: string;
  created?: string;
  layer_index?: number;
  description?: string;
  inputContext?: unknown;
  [key: string]: unknown;
}

const props = defineProps<{ itemMap: TimelineEntry[] }>();
const emit = defineEmits<{ (e: 'entrySelected', entry: TimelineEntry): void }>();

const dedupedItems = computed(() => {
  const seen = new Set<string>();
  const out: TimelineEntry[] = [];
  for (const it of (props.itemMap || [])) {
    const id = String((it.uuid as string) || (it.id as string) || '');
    if (!id) continue;
    if (!seen.has(id)) { seen.add(id); out.push(it); }
  }
  out.sort((a, b) => {
    const ts = (e: TimelineEntry) => { const s = String(e.started || e.created || ''); const t = Date.parse(s); return isFinite(t) ? t : Infinity; };
    return ts(a) - ts(b);
  });
  return out;
});

function formatDate(date?: string): string {
  if (!date) return '';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function onEntrySelected(entry: TimelineEntry) {
  emit('entrySelected', entry);
}
</script>
