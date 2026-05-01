import type {
  CadenzaNuxtRuntime,
  CadenzaNuxtRuntimeState,
} from '@cadenza.io/service/nuxt';

// ---------------------------------------------------------------------------
// Live feed event — a single activity event shown in the UI
// ---------------------------------------------------------------------------

export type LiveEventType =
  | 'routine.started'
  | 'routine.completed'
  | 'routine.errored'
  | 'task.started'
  | 'task.completed'
  | 'task.errored'
  | 'signal.emitted'
  | 'server.active'
  | 'server.inactive';

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  serviceName?: string;
  routineName?: string;
  taskName?: string;
  signalName?: string;
  timestamp: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Projection state — updated by signal bindings in real time
// ---------------------------------------------------------------------------

export type CadenzaUIProjectionState = {
  activityVersion: number;
  lastSignalName: string | null;
  liveFeed: LiveEvent[];
};

// ---------------------------------------------------------------------------
// IoT pipeline signals — increment activityVersion when they arrive
// ---------------------------------------------------------------------------

export const IOT_SIGNALS = [
  'global.iot.telemetry.ingested',
  'global.iot.anomaly.detected',
  'global.iot.prediction.ready',
  'global.iot.prediction.maintenance_needed',
  'global.iot.alert.raised',
] as const;

// ---------------------------------------------------------------------------
// Cadenza system signals — populate liveFeed when they arrive
// ---------------------------------------------------------------------------

export const CADENZA_SIGNALS = {
  routineStarted:  'cadenza.routine.started',
  routineComplete: 'cadenza.routine.complete',
  routineErrored:  'cadenza.routine.errored',
  taskStarted:     'cadenza.task.started',
  taskComplete:    'cadenza.task.complete',
  taskErrored:     'cadenza.task.errored',
  signalEmitted:   'cadenza.signal.emitted',
  serverActive:    'cadenza.server.active',
  serverInactive:  'cadenza.server.inactive',
} as const;

export type CadenzaSignalName = (typeof CADENZA_SIGNALS)[keyof typeof CADENZA_SIGNALS];

// ---------------------------------------------------------------------------
// Signal → LiveEvent transformation
// ---------------------------------------------------------------------------

function payloadToLiveEvent(
  signal: CadenzaSignalName,
  payload: Record<string, any>,
): LiveEvent | null {
  const id = payload.uuid ?? payload.executionId ?? `${signal}-${Date.now()}`;
  const timestamp = payload.timestamp ?? payload.created ?? new Date().toISOString();
  const serviceName: string | undefined = payload.serviceName ?? payload.service_name;

  switch (signal) {
    case CADENZA_SIGNALS.routineStarted:
      return { id, type: 'routine.started', serviceName, routineName: payload.routineName ?? payload.name, timestamp, label: `Routine started: ${payload.name ?? id}` };
    case CADENZA_SIGNALS.routineComplete:
      return { id, type: 'routine.completed', serviceName, routineName: payload.routineName ?? payload.name, timestamp, label: `Routine completed: ${payload.name ?? id}` };
    case CADENZA_SIGNALS.routineErrored:
      return { id, type: 'routine.errored', serviceName, routineName: payload.routineName ?? payload.name, timestamp, label: `Routine errored: ${payload.name ?? id}` };
    case CADENZA_SIGNALS.taskStarted:
      return { id, type: 'task.started', serviceName, taskName: payload.taskName ?? payload.name, timestamp, label: `Task started: ${payload.name ?? id}` };
    case CADENZA_SIGNALS.taskComplete:
      return { id, type: 'task.completed', serviceName, taskName: payload.taskName ?? payload.name, timestamp, label: `Task completed: ${payload.name ?? id}` };
    case CADENZA_SIGNALS.taskErrored:
      return { id, type: 'task.errored', serviceName, taskName: payload.taskName ?? payload.name, timestamp, label: `Task errored: ${payload.name ?? id}` };
    case CADENZA_SIGNALS.signalEmitted:
      return { id, type: 'signal.emitted', serviceName, signalName: payload.signalName ?? payload.signal_name, timestamp, label: `Signal: ${payload.signalName ?? payload.signal_name ?? id}` };
    case CADENZA_SIGNALS.serverActive:
      return { id, type: 'server.active', serviceName, timestamp, label: `Server active: ${serviceName ?? id}` };
    case CADENZA_SIGNALS.serverInactive:
      return { id, type: 'server.inactive', serviceName, timestamp, label: `Server inactive: ${serviceName ?? id}` };
    default:
      return null;
  }
}

function appendLiveEvent(feed: LiveEvent[], event: LiveEvent): LiveEvent[] {
  const deduped = feed.filter((e) => e.id !== event.id);
  return [event, ...deduped].slice(0, 50);
}

// ---------------------------------------------------------------------------
// Signal bindings — one per signal, updating the appropriate state slice
// ---------------------------------------------------------------------------

export function createCadenzaUISignalBindings() {
  const iotBindings = IOT_SIGNALS.map((signalName) => ({
    signal: signalName,
    reduce: (
      current: CadenzaUIProjectionState,
      _payload: Record<string, any>,
    ): CadenzaUIProjectionState => ({
      ...current,
      activityVersion: current.activityVersion + 1,
      lastSignalName: signalName,
    }),
  }));

  const cadenzaBindings = Object.values(CADENZA_SIGNALS).map((signalName) => ({
    signal: signalName,
    reduce: (
      current: CadenzaUIProjectionState,
      payload: Record<string, any>,
    ): CadenzaUIProjectionState => {
      const event = payloadToLiveEvent(signalName as CadenzaSignalName, payload);
      return {
        ...current,
        activityVersion: current.activityVersion + 1,
        lastSignalName: signalName,
        liveFeed: event ? appendLiveEvent(current.liveFeed, event) : current.liveFeed,
      };
    },
  }));

  return [...iotBindings, ...cadenzaBindings];
}

// ---------------------------------------------------------------------------
// Runtime types
// ---------------------------------------------------------------------------

export type CadenzaUIRuntime = CadenzaNuxtRuntime<CadenzaUIProjectionState, Record<string, never>>;
export type CadenzaUIRuntimeState = CadenzaNuxtRuntimeState<CadenzaUIProjectionState>;
