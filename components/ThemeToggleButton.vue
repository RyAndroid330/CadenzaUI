<template>
  <button class="mac-theme-toggle" @click="toggleDarkMode" :title="appStore.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'">
    <q-icon :name="iconName" size="18px" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { useAppStore } from '../stores/app';

const $q = useQuasar();
const appStore = useAppStore();

$q.dark.set(appStore.isDarkMode);

function toggleDarkMode(): void {
  appStore.toggleDarkMode();
  $q.dark.set(appStore.isDarkMode);
}

const iconName = computed((): string =>
  appStore.isDarkMode ? 'light_mode' : 'dark_mode'
);
</script>

<style scoped>
.mac-theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--mac-text-secondary);
  cursor: pointer;
  transition: all var(--mac-transition);
}

.mac-theme-toggle:hover {
  background: var(--mac-border);
  color: var(--mac-text-primary);
}
</style>
