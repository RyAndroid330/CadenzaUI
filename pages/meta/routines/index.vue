<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Routines</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="routines"
          row-key="uuid"
          inspect-base-path="/meta/routines"
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
  appStore.setCurrentSection('meta');
});

const columns = [
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
  { name: 'service',     label: 'Service',     field: 'service',     align: 'left' as const, sortable: true },
  { name: 'version',     label: 'Version',     field: 'version',     align: 'left' as const, sortable: true },
];

const { data } = await useAsyncData('meta-routines', () =>
  $fetch<{ routines: any[] }>('/api/meta/routines'),
);

const routines = computed(() => data.value?.routines ?? []);
</script>
