<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Activity</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="instances"
          row-key="uuid"
          inspect-base-path="/activity/services"
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
  { name: 'service',    label: 'Service',   field: 'service',    align: 'left' as const, sortable: true },
  { name: 'isActive',   label: 'Active',    field: 'isActive',   align: 'left' as const, sortable: true },
  { name: 'isPrimary',  label: 'Primary',   field: 'isPrimary',  align: 'left' as const, sortable: true },
  { name: 'isDatabase', label: 'Database',  field: 'isDatabase', align: 'left' as const, sortable: true },
  { name: 'isFrontend', label: 'Frontend',  field: 'isFrontend', align: 'left' as const, sortable: true },
  { name: 'isBlocked',  label: 'Blocked',   field: 'isBlocked',  align: 'left' as const, sortable: true },
  { name: 'created',    label: 'Created',   field: 'created',    align: 'left' as const, sortable: true },
];

const { data } = await useAsyncData('activity-instances', () =>
  $fetch<{ instances: any[] }>('/api/activity'),
);

const instances = computed(() => data.value?.instances ?? []);
</script>
