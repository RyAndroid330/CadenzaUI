# Server API — Claude Code Guide

## Pattern

All routes use `delegateQuery` from `~/server/utils/cadenza/bridge`:

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

  const rows = await delegateQuery<Record<string, unknown>>(address, port, 'Query table_name', {
    filter: { is_meta: false },  // snake_case
    sort: { name: 'asc' },
    limit,
  });

  return {
    items: rows.map((row) => ({
      uuid: String(row.uuid ?? ''),
      name: String(row.name ?? ''),
      service: String(row.serviceName ?? ''),  // camelCase from response
    })),
  };
});
```

## Delegation Task Names

| Table | Task name |
|---|---|
| `service` | `'Query service'` |
| `task` | `'Query task'` |
| `routine` | `'Query routine'` |
| `signal_registry` | `'Query signal_registry'` |
| `service_instance` | `'Query service_instance'` |
| `routine_execution` | `'Query routine_execution'` |
| `task_execution` | `'Query task_execution'` |
| `signal_emission` | `'Query signal_emission'` |
| `execution_trace` | `'Query execution_trace'` |

## Field Name Reference

Response fields are camelCase. Filter fields are snake_case.

**service**: `name`, `description`, `isMeta`
**task**: `name`, `description`, `serviceName`, `version`, `layerIndex`, `isUnique`, `concurrency`, `isMeta`
**routine**: `uuid`, `name`, `description`, `serviceName`, `version`, `isMeta`
**signal_registry**: `name`, `domain`, `action`, `isGlobal`, `isMeta`
**service_instance**: `uuid`, `serviceName`, `isActive`, `isPrimary`, `isDatabase`, `isFrontend`, `isBlocked`, `created`, `modified`, `deleted`
**routine_execution**: `uuid`, `name`, `serviceName`, `isRunning`, `isComplete`, `errored`, `created`
**task_execution**: `uuid`, `taskName`, `isRunning`, `isComplete`, `errored`, `progress`, `created`
**signal_emission**: `uuid`, `signalName`, `isMeta`, `created`
**execution_trace**: `uuid`, `serviceName`, `created`

## Filters by Section

- **system**: `filter: { is_meta: false }`
- **meta**: `filter: { is_meta: true }`
- **activity/service_instance**: `filter: { deleted: false }`
- **activity/signal_emission**: `filter: { is_meta: false }`
- **activity/routine_execution, task_execution, execution_trace**: no filter
