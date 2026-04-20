<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Signals</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="signals"
          row-key="name"
          inspect-base-path="/system/signals"
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
  appStore.setCurrentSection('system');
});

const columns = [
  { name: 'name',     label: 'Name',     field: 'name',     align: 'left' as const, sortable: true },
  { name: 'domain',   label: 'Domain',   field: 'domain',   align: 'left' as const, sortable: true },
  { name: 'action',   label: 'Action',   field: 'action',   align: 'left' as const, sortable: true },
  { name: 'isGlobal', label: 'Global',   field: 'isGlobal', align: 'left' as const, sortable: true },
];

const { data } = await useAsyncData('system-signals', () =>
  $fetch<{ signals: any[] }>('/api/system/signals'),
);

const signals = computed(() => data.value?.signals ?? []);
</script>
