import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type {
  Alert,
  Manhole,
  Scenario,
  Severity,
  StatusLevel,
  Telemetry,
  Thresholds,
} from '../model/types';
import { assess, DEFAULT_THRESHOLDS, LEVEL_RANK } from '../model/evaluate';
import {
  INITIAL_SCENARIOS,
  MANHOLES,
  initialBootTimes,
  initialTelemetry,
  seedAlerts,
} from '../data/seed';
import { SimulatedTelemetryProvider, type TelemetryProvider } from '../data/simulator';

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

export type Route =
  | { page: 'live' }
  | { page: 'manholes' }
  | { page: 'detail'; id: string }
  | { page: 'alerts' }
  | { page: 'devices' }
  | { page: 'settings' };

export function routeToHash(r: Route): string {
  switch (r.page) {
    case 'live':
      return '#/';
    case 'manholes':
      return '#/manholes';
    case 'detail':
      return `#/manholes/${r.id}`;
    case 'alerts':
      return '#/alerts';
    case 'devices':
      return '#/devices';
    case 'settings':
      return '#/settings';
  }
}

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  const seg = path.split('/').filter(Boolean);
  if (seg[0] === 'manholes') {
    if (seg[1] && MANHOLES.some((m) => m.id === seg[1])) return { page: 'detail', id: seg[1] };
    return { page: 'manholes' };
  }
  if (seg[0] === 'alerts') return { page: 'alerts' };
  if (seg[0] === 'devices') return { page: 'devices' };
  if (seg[0] === 'settings') return { page: 'settings' };
  return { page: 'live' };
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export type GasUnitMode = 'ppm' | 'raw';

export interface Settings {
  gasUnit: GasUnitMode;
  pollMs: number;
  thresholds: Thresholds;
}

export interface AppState {
  route: Route;
  selectedId: string;
  telemetry: Record<string, Telemetry>;
  history: Record<string, Telemetry[]>;
  scenarios: Record<string, Scenario>;
  bootTimes: Record<string, number>;
  alerts: Alert[];
  settings: Settings;
  /** Wall-clock ms, updated every second — drives relative time labels. */
  now: number;
}

type Action =
  | { type: 'route'; route: Route }
  | { type: 'select'; id: string }
  | { type: 'tick'; batch: Record<string, Telemetry> }
  | { type: 'clock'; now: number }
  | { type: 'scenario'; id: string; scenario: Scenario }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'ack'; id: string }
  | { type: 'ackAll' };

const HISTORY_LIMIT = 60;
const ALERT_COOLDOWN_MS = 15_000;

const HISTORY_LIMIT_ = HISTORY_LIMIT;

function pushHistory(prev: Record<string, Telemetry[]>, batch: Record<string, Telemetry>) {
  const next: Record<string, Telemetry[]> = { ...prev };
  for (const id of Object.keys(batch)) {
    const list = next[id] ?? [];
    next[id] = [...list, batch[id]].slice(-HISTORY_LIMIT_);
  }
  return next;
}

const SEVERITY: Record<StatusLevel, Severity | null> = {
  safe: null,
  warning: 'warning',
  high: 'high',
  critical: 'critical',
  offline: 'critical',
};

function alertId(manholeId: string, key: string, timestamp: number) {
  return `${manholeId}:${key}:${timestamp}`;
}

/** Derive new alerts by diffing previous vs next sensor/device states. */
function diffAlerts(
  state: AppState,
  batch: Record<string, Telemetry>,
): { alerts: Alert[]; bootTimes: Record<string, number> } {
  const alerts: Alert[] = [];
  const bootTimes = { ...state.bootTimes };
  const cooldowns = new Map<string, number>();
  for (const a of state.alerts) cooldowns.set(`${a.manholeId}:${a.message}`, a.timestamp);

  const consider = (manholeId: string, key: string, severity: Severity, message: string) => {
    const last = cooldowns.get(`${manholeId}:${message}`);
    if (last !== undefined && state.now - last < ALERT_COOLDOWN_MS) return;
    cooldowns.set(`${manholeId}:${message}`, state.now);
    alerts.push({
      id: alertId(manholeId, key, state.now),
      manholeId,
      severity,
      message,
      timestamp: state.now,
      acknowledged: false,
    });
  };

  for (const m of MANHOLES) {
    const prevT = state.telemetry[m.id];
    const nextT = batch[m.id];
    if (!prevT || !nextT) continue;

    // Device connectivity transitions.
    if (prevT.deviceStatus === 'online' && nextT.deviceStatus === 'offline') {
      consider(m.id, 'device', 'critical', 'Device offline — heartbeat lost');
    }
    if (prevT.deviceStatus === 'offline' && nextT.deviceStatus === 'online') {
      bootTimes[m.id] = state.now;
      consider(m.id, 'device', 'info', 'Device reconnected');
      continue;
    }
    if (nextT.deviceStatus === 'offline') continue;

    // Per-sensor escalations.
    const before = assess(prevT, m, state.settings.thresholds);
    const after = assess(nextT, m, state.settings.thresholds);
    const beforeMap = new Map(before.sensors.map((s) => [s.key, s]));
    for (const s of after.sensors) {
      const b = beforeMap.get(s.key);
      if (!b) continue;
      if (LEVEL_RANK[s.level] > LEVEL_RANK[b.level]) {
        const severity = SEVERITY[s.level];
        if (severity) consider(m.id, s.key, severity, s.detail);
      }
    }
  }

  return { alerts, bootTimes };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'route':
      // A detail route always selects the manhole it points at, so deep links
      // like #/manholes/MG-003 and browser back/forward stay in sync.
      return {
        ...state,
        route: action.route,
        selectedId: action.route.page === 'detail' ? action.route.id : state.selectedId,
      };

    case 'select':
      return { ...state, selectedId: action.id };

    case 'clock':
      return { ...state, now: action.now };

    case 'scenario': {
      const scenarios = { ...state.scenarios, [action.id]: action.scenario };
      const manhole = MANHOLES.find((m) => m.id === action.id);
      if (!manhole) return { ...state, scenarios };

      // Immediately re-render the fleet with the forced state so the demo
      // response is instant, instead of waiting for the next poll tick.
      const now = Date.now();
      const prev = state.telemetry;
      let frame = provider.poll({
        manholes: [manhole],
        previous: prev,
        scenarios,
        gasUnit: state.settings.gasUnit,
        now,
      })[action.id];

      if (action.scenario === 'offline') {
        // Freeze the last live frame and mark the device unreachable.
        const lastLive = prev[action.id];
        frame = lastLive
          ? {
              ...lastLive,
              deviceStatus: 'offline',
              wifiStatus: 'disconnected',
              signalStrength: null,
            }
          : frame;
      }

      const batch = { ...prev, [action.id]: frame };
      const { alerts, bootTimes } = diffAlerts({ ...state, now }, batch);
      return {
        ...state,
        scenarios,
        telemetry: batch,
        history: pushHistory(state.history, { [action.id]: frame }),
        alerts: [...alerts, ...state.alerts].slice(0, 80),
        bootTimes,
        now,
      };
    }

    case 'tick': {
      const batch = { ...state.telemetry, ...action.batch };
      const { alerts, bootTimes } = diffAlerts(state, action.batch);
      return {
        ...state,
        telemetry: batch,
        history: pushHistory(state.history, action.batch),
        alerts: alerts.length ? [...alerts, ...state.alerts].slice(0, 80) : state.alerts,
        bootTimes,
      };
    }

    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'ack':
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, acknowledged: true } : a)),
      };

    case 'ackAll':
      return { ...state, alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })) };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

const provider: TelemetryProvider = new SimulatedTelemetryProvider();

function initState(): AppState {
  const now = Date.now();
  const telemetry = initialTelemetry(INITIAL_SCENARIOS, now, (id, scenario, timestamp) => {
    const manhole = MANHOLES.find((m) => m.id === id)!;
    const frames = provider.poll({
      manholes: [manhole],
      previous: {},
      scenarios: { [id]: scenario },
      gasUnit: 'ppm',
      now: timestamp,
    });
    const frame = frames[id];
    if (scenario === 'offline') {
      return {
        ...frame,
        deviceStatus: 'offline' as const,
        wifiStatus: 'disconnected' as const,
        signalStrength: null,
      };
    }
    return frame;
  });

  return {
    route: { page: 'live' },
    selectedId: 'MG-001',
    telemetry,
    history: Object.fromEntries(Object.entries(telemetry).map(([k, v]) => [k, [v]])),
    scenarios: { ...INITIAL_SCENARIOS },
    bootTimes: initialBootTimes(now),
    alerts: seedAlerts(now),
    settings: { gasUnit: 'ppm', pollMs: 2000, thresholds: DEFAULT_THRESHOLDS },
    now,
  };
}

export interface StoreValue extends AppState {
  manholes: Manhole[];
  provider: TelemetryProvider;
  selected: Manhole;
  selectedTelemetry: Telemetry;
  /** Overall status of the selected manhole. */
  status: StatusLevel;
  assessment: ReturnType<typeof assess>;
  unacknowledged: number;
  navigate: (route: Route) => void;
  select: (id: string) => void;
  setScenario: (id: string, scenario: Scenario) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  acknowledge: (id: string) => void;
  acknowledgeAll: () => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  // Latest frames, so polls can freeze offline devices instead of reviving them.
  const telemetryRef = useRef(state.telemetry);
  telemetryRef.current = state.telemetry;

  // Hash routing — keeps deep links like #/manholes/MG-003 working.
  useEffect(() => {
    dispatch({ type: 'route', route: parseHash(window.location.hash) });
    const onHash = () => dispatch({ type: 'route', route: parseHash(window.location.hash) });
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // 1 Hz clock for relative timestamps ("2 seconds ago").
  useEffect(() => {
    const t = window.setInterval(() => dispatch({ type: 'clock', now: Date.now() }), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Telemetry polling — replaced wholesale by an HTTP/MQTT provider later.
  useEffect(() => {
    const poll = () => {
      dispatch({
        type: 'tick',
        batch: provider.poll({
          manholes: MANHOLES,
          previous: telemetryRef.current,
          scenarios: state.scenarios,
          gasUnit: state.settings.gasUnit,
          now: Date.now(),
        }),
      });
    };
    poll();
    const t = window.setInterval(poll, state.settings.pollMs);
    return () => window.clearInterval(t);
  }, [state.settings.pollMs, state.settings.gasUnit, state.scenarios]);

  const value = useMemo<StoreValue>(() => {
    const manhole = MANHOLES.find((m) => m.id === state.selectedId) ?? MANHOLES[0];
    const telemetry = state.telemetry[manhole.id];
    const assessment = assess(telemetry, manhole, state.settings.thresholds);
    return {
      ...state,
      manholes: MANHOLES,
      provider,
      selected: manhole,
      selectedTelemetry: telemetry,
      status: assessment.status,
      assessment,
      unacknowledged: state.alerts.filter((a) => !a.acknowledged).length,
      navigate: (route) => {
        const hash = routeToHash(route);
        if (window.location.hash !== hash) window.location.hash = hash;
        else dispatch({ type: 'route', route });
      },
      select: (id) => dispatch({ type: 'select', id }),
      setScenario: (id, scenario) => dispatch({ type: 'scenario', id, scenario }),
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      acknowledge: (id) => dispatch({ type: 'ack', id }),
      acknowledgeAll: () => dispatch({ type: 'ackAll' }),
    };
  }, [state]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}
