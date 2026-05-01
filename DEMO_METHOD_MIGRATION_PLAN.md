# Demo-Method Migration Plan

This plan tracks the second-pass migration of `CadenzaUI` page data loading to match the
`cadenza-demo-2/frontend/` pattern more closely:

- initial snapshot via `useAsyncData(...)`
- refresh driven by `useCadenzaProjectionState()`
- background refresh once `useCadenzaRuntimeReady()` is true
- direct `$fetch(...)` for page/API loading
- no page-level `Cadenza.createTask(...)` / `Cadenza.run(...)` wrappers for ordinary data fetches

## Status

- [x] `pages/activity/tasks/index.vue`
- [x] `pages/activity/routines/index.vue`
- [x] `pages/activity/signals/index.vue`
- [x] `pages/activity/traces/index.vue`
- [x] `pages/index.vue`
- [x] `pages/hybrid/index.vue`
- [x] `pages/activity/index.vue`
- [x] `pages/system/index.vue`
- [x] `pages/meta/index.vue`
- [x] `pages/system/services/index.vue`
- [x] `pages/system/tasks/index.vue`
- [x] `pages/system/routines/index.vue`
- [x] `pages/system/signals/index.vue`
- [x] `pages/meta/services/index.vue`
- [x] `pages/meta/tasks/index.vue`
- [x] `pages/meta/routines/index.vue`
- [x] `pages/meta/signals/index.vue`
- [x] `pages/activity/services/[id].vue`
- [x] `pages/activity/routines/[id].vue`
- [x] `pages/activity/tasks/[id].vue`
- [x] `pages/activity/signals/[id].vue`
- [x] `pages/activity/traces/[id].vue`
- [x] `pages/system/services/[id].vue`
- [x] `pages/system/tasks/[id].vue`
- [x] `pages/system/routines/[id].vue`
- [x] `pages/system/signals/[id].vue`
- [x] `pages/meta/services/[id].vue`
- [x] `pages/meta/tasks/[id].vue`
- [x] `pages/meta/routines/[id].vue`
- [x] `pages/meta/signals/[id].vue`

## Migration Result

All current page-level data-loading views under `CadenzaUI/pages` have been migrated to the
demo-method pattern. A verification search for `Cadenza.createTask` and `Cadenza.run(` inside
that directory returned no remaining page-level usages.

## Page-by-page sequence

1. Convert top-level and list pages first.
2. Convert detail pages after their parent list pages are stable.
3. Keep pagination behavior where already present.
4. Prefer signal-driven refresh; use interval refresh as a fallback support layer.
5. After each page conversion, remove page-local `Cadenza.createTask(...)` / `Cadenza.run(...)`
   if they were only being used to wrap `$fetch(...)`.
