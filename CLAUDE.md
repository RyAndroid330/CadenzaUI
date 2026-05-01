# CadenzaUI — Claude Code Guide

## Reference Implementation

**Canonical pattern source**: `cadenza-demo-2/frontend/` — all data fetching, signal binding, and plugin patterns should follow this project. When in doubt, check there first.

**Cadenza demo lessons**: `cadenza-demo-2/docs/demo-lessons.md`

## Project Overview

Nuxt 3 SPA dashboard for the cadenza-demo-2 system. Connects to the same Docker stack (cadenza-db-service + PostgreSQL). Displays services, routines, tasks, signals, and execution activity through tables, flow diagrams, and charts.

## Commands

```bash
npm run dev       # Dev server on :3000
npm run build     # Production build
```

## Environment Variables (`.env`)

```
NUXT_PUBLIC_CADENZA_BOOTSTRAP_URL=http://cadenza-db.localhost:80
CADENZA_SERVER_ADDRESS=http://cadenza-db.localhost
CADENZA_SERVER_PORT=80
```

In Docker: `CADENZA_SERVER_ADDRESS=cadenza-db-service`, `CADENZA_SERVER_PORT=8080`.

## Architecture

```
Browser (Vue SPA)
  ├── defineCadenzaNuxtRuntimePlugin        → WebSocket to cadenza-db-service
  │     └── signalBindings                  → projectionState updates on signal receipt
  └── useAsyncData / useFetch               → Nuxt server routes (SSR snapshot only)

Nuxt Server (Node)
  ├── server/api/**/*.ts                    → SSR data via createSSRInquiryBridge
  │     └── bridge.inquire(intent, ctx)     → cadenza inquiry routing
  └── delegateQuery (cadenza-db tables only)
        └── POST /delegation on cadenza-db-service
```

## Data Fetching Principles

**Rule**: Use Cadenza-native patterns exclusively. No raw `pg.Client`, no HTTP polling, no direct database access.

1. **Live reactive data** → `signalBindings` in the browser plugin. The `projectionState` is the source of truth for anything that changes while the user is on the page.
2. **Initial snapshot (SSR)** → `createSSRInquiryBridge` + `bridge.inquire()` in server API routes. This is the standard Cadenza SSR pattern.
3. **cadenza-db-service tables only (exception)** → `delegateQuery` → `/delegation` endpoint. cadenza-db-service does not register its postgres actor intents as external inquiry responders (`totalResponders: 0`), so the inquiry bridge cannot reach those tables. Use `delegateQuery` only for: `service`, `task`, `routine`, `signal_registry`, `service_instance`, `routine_execution`, `task_execution`, `signal_emission`, `execution_trace`.

## Browser Plugin (`plugins/cadenza.client.ts`)

Use `defineCadenzaNuxtRuntimePlugin` from `@cadenza.io/service/nuxt` — this is the standard Cadenza Nuxt integration:

```ts
import Cadenza from '@cadenza.io/service';
import { defineCadenzaNuxtRuntimePlugin } from '@cadenza.io/service/nuxt';

const setup = defineCadenzaNuxtRuntimePlugin({
  cadenza: Cadenza,
  actorName: 'CadenzaUIRuntimeActor',
  service: {
    name: 'CadenzaUI',
    description: 'CadenzaUI dashboard runtime',
    useSocket: true,
    cadenzaDB: { connect: true },
  },
  bootstrapUrl: (config) => String(config.public.cadenzaBootstrapUrl),
  initialProjectionState: {
    activityVersion: 0,
    lastSignalName: null as string | null,
  },
  signalBindings: IOT_ACTIVITY_SIGNALS.map((signalName) => ({
    signal: signalName,
    reduce: (current, _payload) => ({
      ...current,
      activityVersion: current.activityVersion + 1,
      lastSignalName: signalName,
    }),
  })),
});

export default defineNuxtPlugin(setup);
```

**Do not use `createBrowserRuntimeActor` directly** — `defineCadenzaNuxtRuntimePlugin` wraps it with proper Nuxt lifecycle integration, hydration state, and SSR-safe composables.

## Cadenza Composables

The plugin exposes three composables (auto-imported via Nuxt):

```ts
const projectionState = useCadenzaProjectionState();
// projectionState.value.projectionState.activityVersion — updates on signal receipt

const runtimeReady = useCadenzaRuntimeReady();
// runtimeReady.value — true once WebSocket connected and runtime bootstrapped

const runtime = useCadenzaRuntime();
// runtime.value.inquire(intentName, ctx, opts) — issue inquiries from the browser
```

## Signal-Driven Page Pattern

Pages react to signals, not polling intervals:

```vue
<script setup lang="ts">
const { data, refresh } = await useAsyncData('services', () => $fetch('/api/system/services'));
const projectionState = useCadenzaProjectionState();

// Re-fetch the SSR snapshot whenever a new signal arrives
watch(
  () => projectionState.value.projectionState.activityVersion,
  () => refresh(),
);
</script>
```

**Do not use `setInterval` polling** for primary data refresh. Signal-driven `watch` is the correct pattern.

## Server API — SSR Snapshot Pattern

For tables served by `iot-db-service` or other services that register inquiry intents:

```ts
import { createSSRInquiryBridge } from '@cadenza.io/service';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const bridge = createSSRInquiryBridge({
    cadenzaDB: {
      address: String(config.cadenzaServerAddress ?? 'cadenza-db-service'),
      port: Number(config.cadenzaServerPort ?? 8080),
    },
  });

  const result = await bridge.inquire(
    'query-pg-iot-db-service-postgres-actor-device',
    { queryData: { sort: { name: 'asc' }, limit: 200 } },
    { requireComplete: true, rejectOnTimeout: true, timeout: 5000 },
  );

  return { items: result?.rows ?? [] };
});
```

## Server API — cadenza-db Tables (Exception Pattern)

For `service`, `task`, `routine`, `signal_registry`, `service_instance`, and execution tables — use `delegateQuery` since cadenza-db-service has `totalResponders: 0` for the inquiry broker:

```ts
import { getQuery } from 'h3';
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const q = getQuery(event);
  const limit = Math.min(parseInt((q.limit as string) || '200', 10) || 200, 500);

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query service', {
    filter: { is_meta: false },   // snake_case filter keys
    sort: { name: 'asc' },
    limit,
  });

  return {
    services: rows.map((row) => ({
      name: String(row.name ?? ''),
      description: String(row.description ?? ''),
    })),
  };
});
```

See `server/api/CLAUDE.md` for delegation task names and field reference.

## Critical: camelCase vs snake_case

The delegation endpoint returns **camelCase** field names but expects **snake_case** filter keys:

| Context | Case | Example |
|---|---|---|
| Response fields | camelCase | `row.serviceName`, `row.isActive`, `row.layerIndex` |
| Filter keys | snake_case | `{ is_meta: false }`, `{ deleted: false }` |

## Table Primary Keys

Definition tables use `name` as primary key (no `uuid` in delegation response):

| Table | Primary key | Section |
|---|---|---|
| `service` | `name` | system, meta |
| `task` | `name` | system, meta |
| `routine` | `name` | system, meta |
| `signal_registry` | `name` | system, meta |

Execution tables use `uuid`:

| Table | Primary key | Section |
|---|---|---|
| `service_instance` | `uuid` | activity, meta |
| `routine_execution` | `uuid` | activity |
| `task_execution` | `uuid` | activity |
| `signal_emission` | `uuid` | activity |
| `execution_trace` | `uuid` | activity |

Table navigation uses `row.uuid || row.name` — `||` (not `??`) so empty string falls back correctly.

## Page Structure

```
pages/
├── system/          → Definition tables (is_meta: false)
│   ├── services/
│   ├── tasks/
│   ├── routines/
│   └── signals/
├── activity/        → Execution/runtime tables (no is_meta filter)
│   ├── index        → service_instance (deleted: false)
│   ├── routines/    → routine_execution
│   ├── tasks/       → task_execution
│   ├── signals/     → signal_emission
│   └── traces/      → execution_trace
└── meta/            → Definition tables (is_meta: true)
    ├── index        → service
    ├── routines/
    ├── tasks/
    └── signals/
```

Each index page has a corresponding `[id].vue` detail page.

## Key Components

| Component | Purpose |
|---|---|
| `Table.vue` | Generic paginated table with infinite scroll |
| `hybridFlowMap.vue` | Combined activity + static graph view (ELK hierarchical layout) |
| `NestedFlowMap.vue` | System-page hierarchical Vue Flow diagram (ELK) |
| `CustomNode.vue` / `CustomEdge.vue` | Vue Flow node and edge renderers |
| `HeatMap.vue` | Execution frequency heatmap |
| `ServiceLog.vue` | Service log viewer with severity filtering |

## What NOT To Do

- **Do not use `pg.Client`** — no direct postgres connection. `delegateQuery` covers cadenza-db tables; `bridge.inquire()` covers iot-db tables.
- **Do not poll with `setInterval`** — use `watch(() => projectionState.value.projectionState.activityVersion, refresh)` instead.
- **Do not use `$fetch` in a polling loop** — signals drive re-fetches; there is no need for a timer.
- **Do not use `createBrowserRuntimeActor` directly** — use `defineCadenzaNuxtRuntimePlugin` from `@cadenza.io/service/nuxt`.
- **Do not add `@cadenza.io/service` to `build.transpile`** in this SPA project — causes TypeScript ESM bundling errors. SSR Nuxt apps (like demo-2 frontend) DO need `build.transpile: ['@cadenza.io/service']` because `@cadenza.io/service/nuxt` uses Nuxt composables (`useState`, `useRuntimeConfig`) as bare globals that only resolve when the package is processed through the build pipeline.
- **Do not use `createSSRInquiryBridge` for cadenza-db tables** — cadenza-db-service postgres actor intents are not externally registered (`totalResponders: 0`). Use `delegateQuery` → `/delegation` for those tables.
