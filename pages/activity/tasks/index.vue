<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Tasks</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="tasks"
          row-key="uuid"
          inspect-base-path="/activity/tasks"
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
  { name: 'isRunning',  label: 'Running',  field: 'isRunning',  align: 'left' as const, sortable: true },
  { name: 'isComplete', label: 'Complete', field: 'isComplete', align: 'left' as const, sortable: true },
  { name: 'errored',    label: 'Errored',  field: 'errored',    align: 'left' as const, sortable: true },
  { name: 'progress',   label: 'Progress', field: 'progress',   align: 'left' as const },
  { name: 'created',    label: 'Created',  field: 'created',    align: 'left' as const, sortable: true },
];

const { data } = await useAsyncData('activity-tasks', () =>
  $fetch<{ tasks: any[] }>('/api/activity/tasks'),
);

const tasks = computed(() => data.value?.tasks ?? []);
</script>
