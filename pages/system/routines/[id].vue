<template>
  <NuxtLayout name="dashboard-layout">
    <NuxtLayout name="dashboard-main-layout">
      <template #title>{{ id }}</template>
    </NuxtLayout>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '~/stores/app';

const route = useRoute();
const id = route.params.id;
const appStore = useAppStore();
onMounted(() => {
  appStore.setCurrentSection('system');
});
</script>
