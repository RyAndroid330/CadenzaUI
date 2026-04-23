<template>
  <div class="mac-main-layout">
    <!-- Breadcrumbs + Link row -->
    <div class="mac-topbar">
      <div class="mac-breadcrumb-area">
        <q-breadcrumbs separator="/" :class="['mac-breadcrumbs', sectionClass]">
          <q-breadcrumbs-el :to="'/'" icon="home" class="mac-home-icon" />
          <q-breadcrumbs-el
            v-for="(breadcrumb, index) in breadcrumbs"
            :key="index"
            :to="breadcrumb.to"
            :label="breadcrumb.label"
            :class="{ 'mac-breadcrumb-active': index === breadcrumbs.length - 1 }"
          />
        </q-breadcrumbs>
      </div>
      <div class="mac-topbar-actions">
        <slot name="link" />
      </div>
    </div>

    <!-- Page title -->
    <div class="mac-page-title">
      <slot name="title" />
    </div>

    <!-- Page content -->
    <div class="mac-page-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '~/stores/app';

const route = useRoute();
const appStore = useAppStore();
const currentSection = computed(() => appStore.currentSection);

const sectionClass = computed(() => {
  switch (currentSection.value) {
    case 'system': return 'breadcrumb-system';
    case 'serviceActivity': return 'breadcrumb-activity';
    case 'meta': return 'breadcrumb-meta';
    case 'help': return 'breadcrumb-help';
    default: return '';
  }
});

const breadcrumbs = computed(() => {
  const pathArray = route.path.split('/').filter((segment) => segment);

  const items = [];
  for (let index = 0; index < pathArray.length; index++) {
    const segment = pathArray[index];
    const prev = index > 0 ? pathArray[index - 1] : null;

    if (
      segment === 'services' &&
      (prev === 'meta' || prev === 'activity' || prev === 'active')
    ) {
      continue;
    }

    const cleanSegment = decodeURIComponent(segment.replace('-sub', ''));
    const to =
      index === pathArray.length - 1
        ? null
        : '/' +
          pathArray
            .slice(0, index + 1)
            .join('/')
            .replace('-sub', '');

    items.push({
      label: formatBreadcrumbLabel(cleanSegment),
      to,
    });
  }

  return items;
});

function formatBreadcrumbLabel(segment) {
  if (segment === 'system') return 'System';
  if (segment === 'active') return 'Service Activity';
  if (segment === 'activity') return 'Service Activity';
  if (segment === 'tasks') return 'Tasks';
  if (segment === 'routines') return 'Routines';
  if (segment === 'help') return 'Help';
  if (segment.startsWith('chapter')) {
    const match = segment.match(/^chapter(\d+)/);
    if (match) return `Chapter ${match[1]}`;
    return 'Chapter';
  }
  return segment.charAt(0).toLowerCase() + segment.slice(1).replace(/-/g, ' ');
}
</script>

<style scoped>
.mac-main-layout {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 20px 28px;
  gap: 4px;
}

/* Tighter padding on mobile & tablet */
@media (max-width: 1023px) {
  .mac-main-layout {
    padding: 16px 20px;
  }
}

@media (max-width: 639px) {
  .mac-main-layout {
    padding: 12px 14px;
    gap: 2px;
  }
}

.mac-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mac-breadcrumb-area {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.mac-breadcrumbs {
  background: var(--mac-surface);
  border: 1px solid var(--mac-border);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 0.8125rem;
  color: var(--mac-text-secondary);
}

@media (max-width: 639px) {
  .mac-breadcrumbs {
    font-size: 0.75rem;
    padding: 5px 10px;
  }
}

.mac-breadcrumbs :deep(a),
.mac-breadcrumbs :deep(.q-breadcrumbs__el) {
  color: var(--breadcrumb-accent, var(--mac-text-secondary)) !important;
}

.mac-home-icon {
  color: var(--breadcrumb-accent, var(--mac-accent)) !important;
}

.mac-breadcrumb-active {
  font-weight: 600;
  color: var(--breadcrumb-accent, var(--mac-text-primary));
}

/* Section-specific breadcrumb colors */
.breadcrumb-system  { --breadcrumb-accent: var(--section-system);   border-color: color-mix(in srgb, var(--section-system)   30%, var(--mac-border)); }
.breadcrumb-activity { --breadcrumb-accent: var(--section-activity); border-color: color-mix(in srgb, var(--section-activity) 30%, var(--mac-border)); }
.breadcrumb-meta    { --breadcrumb-accent: var(--section-meta);     border-color: color-mix(in srgb, var(--section-meta)     30%, var(--mac-border)); }
.breadcrumb-help    { --breadcrumb-accent: var(--section-help);     border-color: color-mix(in srgb, var(--section-help)     30%, var(--mac-border)); }

.mac-topbar-actions {
  flex-shrink: 0;
}

.mac-page-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--mac-text-primary);
  padding: 8px 0 4px;
}

@media (max-width: 639px) {
  .mac-page-title {
    font-size: 1.375rem;
    padding: 6px 0 2px;
  }
}

.mac-page-content {
  flex: 1;
}
</style>
