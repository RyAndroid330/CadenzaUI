<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>Hybrid</template>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppStore } from '~/stores/app';

const appStore = useAppStore();
onMounted(() => {
  appStore.setCurrentSection('');
});
</script>
