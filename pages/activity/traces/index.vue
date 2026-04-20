<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Traces</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="traces"
          row-key="uuid"
          inspect-base-path="/activity/traces"
          :has-more-data="false"
        />
      </div>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAppStore } from '~/stores/app';

const appStore = useAppStore();
onMounted(() => {
  appStore.setCurrentSection('serviceActivity');
});

const columns = [
  { name: 'uuid',    label: 'ID',      field: 'uuid',    align: 'left' as const },
  { name: 'service', label: 'Service', field: 'service', align: 'left' as const, sortable: true },
  { name: 'created', label: 'Created', field: 'created', align: 'left' as const, sortable: true },
];

const { data } = await useAsyncData('activity-traces', () =>
  $fetch<{ traces: any[] }>('/api/activity/traces'),
);

const traces = computed(() => data.value?.traces ?? []);
</script>
