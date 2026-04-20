<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Services</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="services"
          row-key="name"
          inspect-base-path="/system/services"
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
  { name: 'name',        label: 'Name',        field: 'name',        align: 'left' as const, sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
];

const { data } = await useAsyncData('system-services', () =>
  $fetch<{ services: any[] }>('/api/system/services'),
);

const services = computed(() => data.value?.services ?? []);
</script>
