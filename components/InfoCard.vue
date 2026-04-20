<template>
  <div class="mac-info-card">
    <div v-if="$slots.title" class="mac-info-card-header">
      <slot name="title" />
    </div>
    <div class="mac-info-card-body">
      <slot name="info" />
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.mac-info-card {
  background: var(--mac-surface);
  border: 1px solid var(--mac-border);
  border-radius: var(--mac-radius-md);
  box-shadow: var(--mac-shadow-sm);
  overflow: auto;
  min-width: 25dvw;
  max-height: 60dvh;
  transition: box-shadow var(--mac-transition);
  margin: 4px;
}

.mac-info-card:hover {
  box-shadow: var(--mac-shadow-md);
}

.mac-info-card-header {
  padding: 16px 20px 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--mac-text-primary);
}

.mac-info-card-body {
  padding: 16px 20px 20px;
  color: var(--mac-text-secondary);
}
</style>
