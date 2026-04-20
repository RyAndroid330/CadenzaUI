<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Meta</template>
      <div class="row q-mx-md">
        <Table
          :columns="columns"
          :rows="services"
          row-key="name"
          inspect-base-path="/meta/services"
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
];

const { data } = await useAsyncData('meta-services', () =>
  $fetch<{ services: any[] }>('/api/meta'),
);

const services = computed(() => data.value?.services ?? []);
</script>
