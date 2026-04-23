# CadenzaUI Migration Plan

Migrating `Cadenza/` into `CadenzaUI/` using `delegateQuery` (bridge.ts) for all server data
and Cadenza SDK tasks (`Cadenza.createTask` / `Cadenza.run`) for browser orchestration.
No `pg.Client`. No raw `$fetch` in pages.

**Rule**: Stop after each item and wait for test confirmation before continuing.

**Resume**: Check `[ ]` vs `[x]` checkboxes below to find where to continue.

---

## Phase 1 — Foundation (do all at once, one test)

- [x] Install missing packages (`vue3-apexcharts`, `@vue-flow/core`, `@vue-flow/minimap`, `elkjs`, `dagre`, `@types/dagre`) ✓
- [x] Copy `assets/css/main.css` ✓
- [x] Copy/merge `stores/app.ts` and `stores/heatmapSettings.ts` ✓
- [x] Copy `composables/` (4 files) ✓
- [x] Copy `lib/cadenza/runtime.ts` ✓
- [x] Copy/update `plugins/apexcharts.client.ts` ✓
- [x] Copy/update `layouts/` (dashboardLayout, dashboardMainLayout, default) ✓
- [x] Copy `typescript-shim.js` ✓
- [x] Update `nuxt.config.ts` (add apexcharts transpile, vue-flow css, vite aliases) ✓

**Test**: Dev server starts, existing pages still render, dark mode toggle works.

---

## Phase 2 — Components (stop after each)

### Simple/standalone components (no sub-dependencies)
- [x] **CustomNode.vue** — Vue Flow node renderer ✓
- [x] **CustomEdge.vue** — Vue Flow edge renderer ✓
- [x] **ProgressRadialBarChart.vue** — Radial progress chart ✓
- [x] **ExecutionStatisticsPieChart.vue** — Pie chart for execution status ✓
- [x] **FrequencyPieChart.vue** — Pie chart for event frequency ✓
- [x] **ApexTimeline.vue** — Timeline chart (ApexCharts) ✓
- [x] **ServiceTimeChart.vue** — Time series chart (ApexCharts) ✓
- [x] **ServerStats.vue** — CPU/RAM usage bars ✓

### Complex components (depend on above)
- [x] **ServiceLog.vue** — Log viewer with severity filtering ✓
- [x] **FlowMap.vue** — Vue Flow service/task diagram ✓
- [x] **NestedFlowMap.vue** — Hierarchical Vue Flow graph ✓
- [x] **hybridFlowMap.vue** — Combined activity + static flow ✓
- [x] **serverMap.vue** — Vue Flow service network with ELK layout ✓
- [x] **HeatMap.vue** — Execution frequency heatmap (drill-down year/month/day) ✓

---

## Phase 3 — Server API Routes (stop after each group)

New routes needed beyond what already exists (see `server/api/CLAUDE.md` for existing):

### Activity routes
- [x] `server/api/activity/servers/index.ts` ✓
- [x] `server/api/activity/servers/[id].ts` ✓
- [x] `server/api/activity/servers/allLogs.ts` ✓
- [x] `server/api/activity/servers/instanceLog.ts` ✓
- [x] `server/api/activity/routines/[id].ts` ✓
- [x] `server/api/activity/tasks/[id].ts` ✓
- [x] `server/api/activity/tasks/activeTasks.ts` ✓
- [x] `server/api/activity/signals/[id].ts` ✓
- [x] `server/api/activity/traces/[id].ts` ✓

### System routes
- [x] `server/api/system/graph.ts` ✓
- [x] `server/api/system/tasks/[id].ts` ✓
- [x] `server/api/system/routines/[id].ts` ✓
- [x] `server/api/system/services/[id].ts` ✓
- [x] `server/api/system/signals/[id].ts` ✓
- [x] `server/api/system/traffic.ts` ✓

### Meta routes
- [x] `server/api/meta/servers.ts` ✓
- [x] `server/api/meta/graph.ts` ✓
- [x] `server/api/meta/services/[id].ts` ✓
- [x] `server/api/meta/routines/[id].ts` ✓
- [x] `server/api/meta/tasks/[id].ts` ✓
- [x] `server/api/meta/signals/[id].ts` ✓

### Heatmap / stats routes
- [x] `server/api/heatmap/routines.ts` ✓
- [x] `server/api/stats/executions.ts` ✓

---

## Phase 4 — Pages (stop after each)

Each page: replace empty/stub with full implementation using Cadenza.createTask + the new server routes.

### Home
- [x] `pages/index.vue` — server stats, heatmap, execution pie chart, service log ✓

### Activity section
- [x] `pages/activity/index.vue` *(enhance existing)* — server map + table ✓
- [x] `pages/activity/routines/index.vue` *(enhance existing)* — add FrequencyPieChart ✓
- [x] `pages/activity/routines/[id].vue` — routine execution detail ✓
- [x] `pages/activity/tasks/index.vue` *(enhance existing)* — add FrequencyPieChart ✓
- [x] `pages/activity/tasks/[id].vue` — task execution detail ✓
- [x] `pages/activity/signals/index.vue` *(already working)*
- [x] `pages/activity/signals/[id].vue` — signal emission detail ✓
- [x] `pages/activity/services/[id].vue` — service instance detail with InfoCards + ServiceLog ✓
- [x] `pages/activity/traces/index.vue` *(already working)*
- [x] `pages/activity/traces/[id].vue` — trace detail with routine table ✓

### System section
- [x] `pages/system/index.vue` — NestedFlowMap of service→routine→task graph ✓
- [x] `pages/system/tasks/index.vue` *(already working)*
- [x] `pages/system/tasks/[id].vue` — task definition detail ✓
- [x] `pages/system/routines/index.vue` *(already working)*
- [x] `pages/system/routines/[id].vue` — routine definition detail ✓
- [x] `pages/system/services/index.vue` *(already working)*
- [x] `pages/system/services/[id].vue` — service detail with tasks + routines tables ✓
- [x] `pages/system/signals/index.vue` *(already working)*
- [x] `pages/system/signals/[id].vue` — signal detail ✓

### Meta section
- [x] `pages/meta/index.vue` *(enhance existing)* — add server map ✓
- [x] `pages/meta/tasks/index.vue` *(already working)*
- [x] `pages/meta/tasks/[id].vue` ✓
- [x] `pages/meta/routines/index.vue` *(already working)*
- [x] `pages/meta/routines/[id].vue` ✓
- [x] `pages/meta/services/[id].vue` ✓
- [x] `pages/meta/signals/index.vue` *(already working)*
- [x] `pages/meta/signals/[id].vue` ✓

### Other pages
- [x] `pages/hybrid/index.vue` — hybrid flow map ✓
- [x] `pages/login/index.vue` — login stub ✓
- [x] `pages/help/*.vue` — static content (already present)

---

## Reference

### Data fetching pattern (pages)
```ts
const fetchDataTask = Cadenza.createTask('Fetch Items', async (context) => {
  const data = await $fetch('/api/section/resource');
  items.value = data.items;
  return context;
});
onMounted(() => Cadenza.run(Cadenza.createRoutine('Load Page', [fetchDataTask]), {}));
```

### Server route pattern
See `CadenzaUI/server/api/CLAUDE.md` — all routes use `delegateQuery` from bridge.ts.

### Packages installed in Phase 1
- `vue3-apexcharts` — charts
- `@vue-flow/core` + `@vue-flow/minimap` — flow diagrams
- `elkjs` + `dagre` + `@types/dagre` — graph layout engines
