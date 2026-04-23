<template>
  <div class="collapsible-section" :class="{ 'is-open': isOpen }">
    <button
      class="collapsible-header"
      :class="sectionClass"
      @click="toggle"
      :aria-expanded="isOpen"
    >
      <q-icon v-if="icon" :name="icon" size="16px" class="collapsible-icon" />
      <span class="collapsible-title">{{ title }}</span>
      <q-icon
        :name="isOpen ? 'expand_less' : 'expand_more'"
        size="18px"
        class="collapsible-chevron"
      />
    </button>

    <Transition name="collapsible">
      <div v-if="isOpen" class="collapsible-body">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  title: string;
  icon?: string;
  section?: 'system' | 'activity' | 'meta' | 'help' | '';
  defaultOpen?: boolean;
  modelValue?: boolean;
}>(), {
  icon: '',
  section: '',
  defaultOpen: true,
  modelValue: undefined,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Support both controlled (v-model) and uncontrolled usage
const internalOpen = ref(props.modelValue !== undefined ? props.modelValue : props.defaultOpen);

const isOpen = ref(internalOpen.value);

watch(() => props.modelValue, (val) => {
  if (val !== undefined) isOpen.value = val;
});

const toggle = () => {
  isOpen.value = !isOpen.value;
  emit('update:modelValue', isOpen.value);
};

const sectionClass = props.section ? `collapsible-header--${props.section}` : '';
</script>

<style scoped>
.collapsible-section {
  border-radius: var(--mac-radius-md);
  overflow: hidden;
  border: 1px solid var(--mac-border);
  background: var(--mac-surface);
  box-shadow: var(--mac-shadow-sm);
  transition: box-shadow var(--mac-transition);
}

.collapsible-section:hover {
  box-shadow: var(--mac-shadow-md);
}

.collapsible-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  /* Ensure min 44px touch target on mobile */
  min-height: 44px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--mac-text-primary);
  text-align: left;
  transition: background var(--mac-transition);
  -webkit-tap-highlight-color: transparent;
}

.collapsible-header:hover {
  background: var(--mac-border);
}

.collapsible-icon {
  color: var(--mac-text-tertiary);
  flex-shrink: 0;
  transition: color var(--mac-transition);
}

/* Section-tinted icons */
.collapsible-header--system  .collapsible-icon { color: var(--section-system); }
.collapsible-header--activity .collapsible-icon { color: var(--section-activity); }
.collapsible-header--meta    .collapsible-icon { color: var(--section-meta); }
.collapsible-header--help    .collapsible-icon { color: var(--section-help); }

.collapsible-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapsible-chevron {
  color: var(--mac-text-tertiary);
  flex-shrink: 0;
  transition: transform var(--mac-transition), color var(--mac-transition);
}

.is-open .collapsible-chevron {
  transform: rotate(0deg);
}

.collapsible-body {
  padding: 0 16px 16px;
  border-top: 1px solid var(--mac-border);
}

/* Smooth open / close animation */
.collapsible-enter-active,
.collapsible-leave-active {
  transition: opacity 180ms ease, transform 180ms ease, max-height 250ms ease;
  overflow: hidden;
  max-height: 2000px;
}

.collapsible-enter-from,
.collapsible-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}
</style>
