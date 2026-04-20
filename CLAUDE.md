# CadenzaUI — Claude Code Guide

## Project Overview

Nuxt 3 SPA dashboard for the cadenza-demo-2 system. Connects to the same Docker stack as demo-2 (cadenza-db-service + PostgreSQL). Displays services, routines, tasks, signals, and execution activity through tables.

## Commands

```bash
npm run dev       # Dev server on :3000
npm run build     # Production build
```

## Environment Variables (`.env`)

```
CADENZA_DB_ADDRESS=http://cadenza-db.localhost   # Full URL or hostname
CADENZA_DB_PORT=80                               # Port (80 via edge proxy locally)
NUXT_PUBLIC_CADENZA_BOOTSTRAP_URL=http://cadenza-db.localhost:80
```

In Docker: `CADENZA_DB_ADDRESS=cadenza-db-service`, `CADENZA_DB_PORT=8080`.

## Architecture

```
Browser (Vue SPA)
  └── useAsyncData(() => $fetch('/api/...'))  → Nuxt server routes

Nuxt Server (Node)
  └── server/api/**/*.ts                      → delegateQuery() to cadenza-db-service
      └── server/utils/cadenza/bridge.ts      → POST /delegation endpoint

cadenza-db-service (Docker)
  └── /delegation endpoint                    → queries internal postgres tables
```

## Data Fetching Pattern

**Pages** use `useAsyncData` wrapping `$fetch`:
```ts
const { data } = await useAsyncData('cache-key', () =>
  $fetch<{ items: any[] }>('/api/section/resource'),
);
const items = computed(() => data.value?.items ?? []);
```

**Server API routes** use `delegateQuery` from bridge.ts — do NOT use `pg.Client` or `createSSRInquiryBridge`:
```ts
import { delegateQuery } from '~/server/utils/cadenza/bridge';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'GET') return;
  const config = useRuntimeConfig(event);
  const address = String(config.cadenzaServerAddress ?? 'http://cadenza-db.localhost');
  const port = Number(config.cadenzaServerPort ?? 80);
  const rows = await delegateQuery(address, port, 'Query table_name', {
    filter: { is_meta: false },   // snake_case filter keys
    sort: { name: 'asc' },
    limit,
  });
  return { items: rows.map((row) => ({ name: String(row.name ?? '') })) };
});
```

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
│   ├── services/    → Query service
│   ├── tasks/       → Query task
│   ├── routines/    → Query routine
│   └── signals/     → Query signal_registry
├── activity/        → Execution/runtime tables (no is_meta filter)
│   ├── index        → Query service_instance (deleted: false)
│   ├── routines/    → Query routine_execution
│   ├── tasks/       → Query task_execution
│   ├── signals/     → Query signal_emission
│   └── traces/      → Query execution_trace
└── meta/            → Definition tables (is_meta: true)
    ├── index        → Query service
    ├── routines/    → Query routine
    ├── tasks/       → Query task
    └── signals/     → Query signal_registry
```

Each index page has a corresponding `[id].vue` detail page.

## Table Component (`components/Table.vue`)

Key props:
- `inspect-base-path="/section/resource"` — enables inspect button navigation to `[id]` page
- `:has-more-data="false"` — disables infinite scroll for static lists
- `row-key` — use `"name"` for definition tables, `"uuid"` for execution tables

Stop and Generate Trace action buttons are placeholder dialogs.

## Server API Routes

```
server/api/
├── system/
│   ├── services.ts
│   ├── tasks.ts
│   ├── routines.ts
│   └── signals.ts
├── activity/
│   ├── index.ts       (service_instance)
│   ├── routines.ts    (routine_execution)
│   ├── tasks.ts       (task_execution)
│   ├── signals.ts     (signal_emission)
│   └── traces.ts      (execution_trace)
└── meta/
    ├── index.ts       (service, is_meta: true)
    ├── routines.ts
    ├── tasks.ts
    └── signals.ts

server/utils/cadenza/bridge.ts   ← delegateQuery() utility
```

## What NOT To Do

- **Do not use `pg.Client`** — no direct postgres connection needed; `delegateQuery` covers all cadenza-db tables
- **Do not use `createSSRInquiryBridge`** — only works for iot-db-service intents (device, alert, telemetry, health_metric), not cadenza-db internal tables
- **Do not use `CadenzaService.inquire()`** — returns `totalResponders: 0` for all cadenza-db query IDs
- **Do not add `@cadenza.io/service` to `build.transpile`** — causes TypeScript ESM bundling errors

## Cadenza Browser Plugin (`plugins/cadenza.client.ts`)

Uses `Cadenza.createBrowserRuntimeActor` directly (not `defineCadenzaNuxtRuntimePlugin`) to avoid needing `build.transpile`. Only used for live signal subscriptions via WebSocket — not for data fetching.
