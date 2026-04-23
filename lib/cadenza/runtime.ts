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
  liveFeed: LiveEvent[];
};

// ---------------------------------------------------------------------------
// Known signals emitted by the monitored Cadenza services
// Update these to match the actual signal names in cadenza-db-service
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

// Keep only the 50 most recent events, deduplicated by id
function appendLiveEvent(feed: LiveEvent[], event: LiveEvent): LiveEvent[] {
  const deduped = feed.filter((e) => e.id !== event.id);
  return [event, ...deduped].slice(0, 50);
}

// ---------------------------------------------------------------------------
// Signal bindings — one binding per signal
// ---------------------------------------------------------------------------

function createSignalBinding(signal: CadenzaSignalName) {
  return {
    signal,
    reduce: (
      current: CadenzaUIProjectionState,
      payload: Record<string, any>,
    ): CadenzaUIProjectionState => {
      const event = payloadToLiveEvent(signal, payload);
      if (!event) return current;
      return { ...current, liveFeed: appendLiveEvent(current.liveFeed, event) };
    },
  };
}

export function createCadenzaUISignalBindings() {
  return Object.values(CADENZA_SIGNALS).map(createSignalBinding);
}

// ---------------------------------------------------------------------------
// Runtime types
// ---------------------------------------------------------------------------

export type CadenzaUIRuntime = CadenzaNuxtRuntime<CadenzaUIProjectionState, Record<string, never>>;
export type CadenzaUIRuntimeState = CadenzaNuxtRuntimeState<CadenzaUIProjectionState>;
