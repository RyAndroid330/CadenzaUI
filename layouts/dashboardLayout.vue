<template>
  <q-layout view="hHh LpR lFf">
    <!-- macOS-style frosted glass header -->
    <q-header class="mac-header" :elevated="false">
      <q-toolbar class="mac-toolbar">
        <!-- Logo -->
        <div class="mac-logo-area">
          <q-img src="/CadenzaLogo.png" class="mac-logo" />
          <span class="mac-logo-text">Cadenza</span>
        </div>

        <!-- Navigation pills -->
        <div v-if="appStore.isLoggedIn" class="mac-nav-pills">
          <button
            v-for="nav in navItems"
            :key="nav.path"
            :class="['mac-nav-pill', { active: isActiveNav(nav.section) }]"
            @click="navigateTo(nav.path, nav.section)"
            @contextmenu.prevent="openLinkInNewTab(nav.path)"
          >
            <q-icon :name="nav.icon" size="16px" />
            {{ nav.label }}
          </button>
        </div>

        <q-space />

        <!-- Right side controls -->
        <div class="mac-header-actions">
          <ThemeToggleButton />
        </div>
      </q-toolbar>
    </q-header>

    <!-- macOS-style sidebar -->
    <q-drawer
      v-if="appStore.isLoggedIn"
      v-model="drawerOpen"
      :mini="miniState"
      :mini-to-overlay="false"
      behavior="default"
      :breakpoint="0"
      side="left"
      :width="260"
      :mini-width="68"
      class="mac-sidebar"
      :elevated="false"
    >
      <!-- Mini toggle -->
      <div class="mac-sidebar-toggle">
        <q-btn
          dense
          flat
          round
          size="sm"
          :icon="miniState ? 'chevron_right' : 'chevron_left'"
          @click="toggleDrawer"
          class="mac-toggle-btn"
        />
      </div>

      <!-- Sidebar content -->
      <q-scroll-area class="mac-sidebar-scroll" :style="{ height: 'calc(100vh - 52px - 48px - 160px)' }">
        <div class="mac-sidebar-content">
          <!-- System section -->
          <div class="mac-nav-section">
            <div v-if="!miniState" class="mac-nav-label">System</div>
            <nav class="mac-nav-group">
              <a
                v-for="item in systemItems"
                :key="item.path"
                :class="['mac-nav-item', 'section-system', { active: isCurrentPath(item.path) }]"
                @click="navigateTo(item.path, 'system')"
                @contextmenu.prevent="openLinkInNewTab(item.path)"
              >
                <q-icon :name="item.icon" size="18px" />
                <span v-if="!miniState" class="mac-nav-item-text">{{ item.label }}</span>
                <q-tooltip v-if="miniState" anchor="center right" self="center left" :offset="[8, 0]">
                  {{ item.label }}
                </q-tooltip>
              </a>
            </nav>
          </div>

          <!-- Activity section -->
          <div class="mac-nav-section">
            <div v-if="!miniState" class="mac-nav-label">Activity</div>
            <nav class="mac-nav-group">
              <a
                v-for="item in activityItems"
                :key="item.path"
                :class="['mac-nav-item', 'section-activity', { active: isCurrentPath(item.path) }]"
                @click="navigateTo(item.path, 'serviceActivity')"
                @contextmenu.prevent="openLinkInNewTab(item.path)"
              >
                <q-icon :name="item.icon" size="18px" />
                <span v-if="!miniState" class="mac-nav-item-text">{{ item.label }}</span>
                <q-tooltip v-if="miniState" anchor="center right" self="center left" :offset="[8, 0]">
                  {{ item.label }}
                </q-tooltip>
              </a>
            </nav>
          </div>

          <!-- Meta section -->
          <div class="mac-nav-section">
            <div v-if="!miniState" class="mac-nav-label">Meta</div>
            <nav class="mac-nav-group">
              <a
                v-for="item in metaItems"
                :key="item.path"
                :class="['mac-nav-item', 'section-meta', { active: isCurrentPath(item.path) }]"
                @click="navigateTo(item.path, 'meta')"
                @contextmenu.prevent="openLinkInNewTab(item.path)"
              >
                <q-icon :name="item.icon" size="18px" />
                <span v-if="!miniState" class="mac-nav-item-text">{{ item.label }}</span>
                <q-tooltip v-if="miniState" anchor="center right" self="center left" :offset="[8, 0]">
                  {{ item.label }}
                </q-tooltip>
              </a>
            </nav>
          </div>
        </div>
      </q-scroll-area>

      <!-- Sidebar footer -->
      <div class="mac-sidebar-footer">
        <div class="mac-nav-section">
          <nav class="mac-nav-group">
            <a
              v-for="item in helpItems"
              :key="item.path"
              :class="['mac-nav-item', 'section-help', { active: isCurrentPath(item.path) }]"
              @click="navigateTo(item.path, 'help')"
              @contextmenu.prevent="openLinkInNewTab(item.path)"
            >
              <q-icon :name="item.icon" size="18px" />
              <span v-if="!miniState" class="mac-nav-item-text">{{ item.label }}</span>
              <q-tooltip v-if="miniState" anchor="center right" self="center left" :offset="[8, 0]">
                {{ item.label }}
              </q-tooltip>
            </a>
          </nav>
        </div>
      </div>
    </q-drawer>

    <!-- Main content area -->
    <q-page-container class="mac-page-container">
      <slot />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAppStore } from '~/stores/app';
import { useOpenLinkInNewTab } from '~/composables/useOpenLinkInNewTab';
import ThemeToggleButton from '~/components/ThemeToggleButton.vue';

const router = process.client ? useRouter() : null;
const route = useRoute();
const appStore = useAppStore();
const { currentSection } = storeToRefs(appStore);
const { openLinkInNewTab } = useOpenLinkInNewTab();

const drawerOpen = ref(true);
const miniState = ref(false);

const navItems = [
  { label: 'Home', path: '/', section: 'home', icon: 'home' },
  { label: 'System', path: '/system', section: 'system', icon: 'dns' },
  { label: 'Activity', path: '/activity', section: 'serviceActivity', icon: 'show_chart' },
];

const systemItems = [
  { label: 'Overview', path: '/system', icon: 'dashboard' },
  { label: 'Services', path: '/system/services', icon: 'cloud' },
  { label: 'Routines', path: '/system/routines', icon: 'repeat' },
  { label: 'Tasks', path: '/system/tasks', icon: 'task_alt' },
  { label: 'Signals', path: '/system/signals', icon: 'cell_tower' },
];

const activityItems = [
  { label: 'Overview', path: '/activity', icon: 'dashboard' },
  { label: 'Traces', path: '/activity/traces', icon: 'route' },
  { label: 'Routines', path: '/activity/routines', icon: 'repeat' },
  { label: 'Tasks', path: '/activity/tasks', icon: 'task_alt' },
  { label: 'Signals', path: '/activity/signals', icon: 'cell_tower' },
];

const metaItems = [
  { label: 'Overview', path: '/meta', icon: 'dashboard' },
  { label: 'Routines', path: '/meta/routines', icon: 'repeat' },
  { label: 'Tasks', path: '/meta/tasks', icon: 'task_alt' },
  { label: 'Signals', path: '/meta/signals', icon: 'cell_tower' },
];

const helpItems = [
  { label: 'Help', path: '/help', icon: 'help_outline' },
  { label: 'Processing Graph', path: '/help/processingGraph', icon: 'schema' },
  { label: 'Terminology', path: '/help/terms', icon: 'menu_book' },
  { label: 'FAQ', path: '/help/faq', icon: 'quiz' },
];

const navigateTo = (path, section) => {
  appStore.setCurrentSection(section);
  if (miniState.value) miniState.value = false;
  router?.push(path);
};

const isActiveNav = (section) => {
  if (section === 'home' && !currentSection.value) return true;
  return currentSection.value === section;
};

const isCurrentPath = (path) => {
  if (path === '/system' || path === '/activity' || path === '/meta' || path === '/help') {
    return route.path === path;
  }
  return route.path === path || route.path.startsWith(path + '/');
};

const toggleDrawer = () => {
  miniState.value = !miniState.value;
};

const handleResize = () => {
  miniState.value = window.innerWidth < 1024;
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  handleResize();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style>
/* ===== macOS Header ===== */
.mac-header {
  background: var(--mac-header-bg) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border-bottom: 1px solid var(--mac-border) !important;
  box-shadow: none !important;
}

.mac-toolbar {
  height: 52px !important;
  min-height: 52px !important;
  padding: 0 16px !important;
}

.mac-logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 24px;
}

.mac-logo {
  width: 28px;
  height: 28px;
}

.mac-logo-text {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--mac-text-primary);
}

/* Navigation Pills */
.mac-nav-pills {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: var(--mac-surface-secondary);
  border-radius: var(--mac-radius-sm);
}

.mac-nav-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-family: var(--font-family);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--mac-text-secondary);
  cursor: pointer;
  transition: all var(--mac-transition);
  white-space: nowrap;
}

.mac-nav-pill:hover {
  color: var(--mac-text-primary);
  background: var(--mac-border);
}

.mac-nav-pill.active {
  background: var(--mac-surface);
  color: var(--mac-text-primary);
  box-shadow: var(--mac-shadow-sm);
}

.mac-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== macOS Sidebar ===== */
.mac-sidebar {
  background: var(--mac-sidebar-bg) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border-right: 1px solid var(--mac-border) !important;
  box-shadow: none !important;
}

.mac-sidebar .q-drawer__content {
  display: flex;
  flex-direction: column;
  background: transparent !important;
  overflow: hidden;
}

.mac-sidebar-toggle {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
  flex-shrink: 0;
}

.mac-toggle-btn {
  color: var(--mac-text-tertiary) !important;
  transition: color var(--mac-transition) !important;
}

.mac-toggle-btn:hover {
  color: var(--mac-text-primary) !important;
}

.mac-sidebar-scroll {
  flex: 1;
  min-height: 0;
}

.mac-sidebar-content {
  padding: 0 12px 12px;
}

.mac-sidebar-footer {
  flex-shrink: 0;
  padding: 8px 12px 16px;
  border-top: 1px solid var(--mac-border);
}

/* Nav sections */
.mac-nav-section {
  margin-bottom: 20px;
}

.mac-nav-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mac-text-tertiary);
  padding: 0 10px 6px;
}

.mac-nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mac-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 6px;
  color: var(--mac-text-secondary);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  text-decoration: none;
  user-select: none;
}

.mac-nav-item:hover {
  background: var(--mac-border);
  color: var(--mac-text-primary);
}

/* Section-specific active colors */
.mac-nav-item.section-system.active {
  background: var(--section-system);
  color: #fff;
}

.mac-nav-item.section-activity.active {
  background: var(--section-activity);
  color: #fff;
}

.mac-nav-item.section-meta.active {
  background: var(--section-meta);
  color: #fff;
}

.mac-nav-item.section-help.active {
  background: var(--section-help);
  color: #fff;
}

.mac-nav-item.active .q-icon {
  color: #fff !important;
}

.mac-nav-item-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Main Content Area ===== */
.mac-page-container {
  background: var(--mac-bg) !important;
  min-height: 100vh;
}
</style>
