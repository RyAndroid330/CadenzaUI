<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Routines</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="routines"
          row-key="uuid"
          inspect-base-path="/activity/routines"
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
  { name: 'name',       label: 'Name',     field: 'name',       align: 'left' as const, sortable: true },
  { name: 'service',    label: 'Service',  field: 'service',    align: 'left' as const, sortable: true },
  { name: 'isRunning',  label: 'Running',  field: 'isRunning',  align: 'left' as const, sortable: true },
  { name: 'isComplete', label: 'Complete', field: 'isComplete', align: 'left' as const, sortable: true },
  { name: 'errored',    label: 'Errored',  field: 'errored',    align: 'left' as const, sortable: true },
  { name: 'created',    label: 'Created',  field: 'created',    align: 'left' as const, sortable: true },
];

const { data } = await useAsyncData('activity-routines', () =>
  $fetch<{ routines: any[] }>('/api/activity/routines'),
);

const routines = computed(() => data.value?.routines ?? []);
</script>
