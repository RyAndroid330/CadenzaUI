<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Signals</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="signals"
          row-key="uuid"
          inspect-base-path="/activity/signals"
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
  { name: 'name',    label: 'Signal',  field: 'name',    align: 'left' as const, sortable: true },
  { name: 'created', label: 'Created', field: 'created', align: 'left' as const, sortable: true },
];

const { data } = await useAsyncData('activity-signals', () =>
  $fetch<{ signals: any[] }>('/api/activity/signals'),
);

const signals = computed(() => data.value?.signals ?? []);
</script>
