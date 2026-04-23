<template>
  <div class="mac-server-stats">
    <div class="mac-server-stats-badge">Live Data</div>

    <div v-if="loading" class="mac-stats-empty">
      <q-spinner-dots size="32px" class="q-mb-sm" />
      <span class="mac-stats-empty-text">Loading server stats...</span>
    </div>

    <div v-else-if="!hasData" class="mac-stats-empty">
      <q-icon name="dns" size="40px" color="grey-5" class="q-mb-sm" />
      <span class="mac-stats-empty-text">No server data available</span>
    </div>

    <div v-else class="mac-stats-bars">
      <div class="mac-stat-row">
        <div class="mac-stat-label">
          <q-icon name="memory" size="16px" />
          <span>CPU</span>
        </div>
        <div class="mac-stat-bar-track">
          <div class="mac-stat-bar-fill mac-stat-cpu" :style="{ width: Math.round(selectedServer.cpu * 100) + '%' }"></div>
        </div>
        <span class="mac-stat-value">{{ Math.round(selectedServer.cpu * 100) }}%</span>
      </div>

      <div class="mac-stat-row">
        <div class="mac-stat-label">
          <q-icon name="developer_board" size="16px" />
          <span>GPU</span>
        </div>
        <div class="mac-stat-bar-track">
          <div class="mac-stat-bar-fill mac-stat-gpu" :style="{ width: Math.round(selectedServer.gpu * 100) + '%' }"></div>
        </div>
        <span class="mac-stat-value">{{ Math.round(selectedServer.gpu * 100) }}%</span>
      </div>

      <div class="mac-stat-row">
        <div class="mac-stat-label">
          <q-icon name="sd_storage" size="16px" />
          <span>RAM</span>
        </div>
        <div class="mac-stat-bar-track">
          <div class="mac-stat-bar-fill mac-stat-ram" :style="{ width: Math.min((selectedServer.ram / (128 * 1024)) * 100, 100) + '%' }"></div>
        </div>
        <span class="mac-stat-value">{{ (selectedServer.ram / 1024).toFixed(1) }}GB</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ServerStats {
  cpu: number;
  gpu: number;
  ram: number;
}

const props = defineProps<{
  selectedServer: ServerStats;
  loading?: boolean;
  hasData?: boolean;
}>();
</script>

<style scoped>
.mac-server-stats {
  background: var(--mac-surface);
  border: 1px solid var(--mac-border);
  border-radius: var(--mac-radius-md);
  padding: 20px;
  max-width: 50dvw;
  max-height: 70dvh;
  overflow-y: auto;
  position: relative;
}

.mac-server-stats-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mac-orange);
  background: rgba(255, 149, 0, 0.1);
  padding: 2px 8px;
  border-radius: 100px;
}

.mac-stats-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: var(--mac-text-tertiary);
}

.mac-stats-empty-text {
  font-size: 0.875rem;
  color: var(--mac-text-tertiary);
}

.mac-stats-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.mac-stat-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mac-stat-label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 60px;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--mac-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.mac-stat-bar-track {
  flex: 1;
  height: 8px;
  background: var(--mac-surface-secondary);
  border-radius: 100px;
  overflow: hidden;
}

.mac-stat-bar-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.mac-stat-cpu {
  background: linear-gradient(90deg, #007AFF, #5AC8FA);
}

.mac-stat-gpu {
  background: linear-gradient(90deg, #34C759, #30D158);
}

.mac-stat-ram {
  background: linear-gradient(90deg, #FF9500, #FFD60A);
}

.mac-stat-value {
  width: 52px;
  flex-shrink: 0;
  text-align: right;
  font-size: 0.8125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--mac-text-primary);
}
</style>
