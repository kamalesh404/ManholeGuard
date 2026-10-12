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
  Severity,
  StatusLevel,
  Telemetry,
  Thresholds,
} from '../model/types';
import { assess, DEFAULT_THRESHOLDS, LEVEL_RANK } from '../model/evaluate';
import { MANHOLES } from '../data/seed';
import { emptyTelemetry, type TelemetryProvider } from '../data/provider';
import { ArduinoTelemetryProvider } from '../data/arduino';

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

export interface Settings {
  pollMs: number;
  thresholds: Thresholds;
}

export interface AppState {
  route: Route;
  selectedId: string;
  telemetry: Record<string, Telemetry>;
  history: Record<string, Telemetry[]>;
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
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'ack'; id: string }
  | { type: 'ackAll' };

const HISTORY_LIMIT = 60;
const ALERT_COOLDOWN_MS = 15_000;

const HISTORY_LIMIT_ = HISTORY_LIMIT;

function pushHistory(prev: Record<string, Telemetry[]>, batch: Record<string, Telemetry>) {
  const next: Record<string, Telemetry[]> = { ...prev };
  for (const id of Object.keys(batch)) {
    const frame = batch[id];
    if (!frame?.hasData) continue; // empty frames are not history
    const list = next[id] ?? [];
    next[id] = [...list, frame].slice(-HISTORY_LIMIT_);
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
      consider(m.id, 'device', 'info', prevT.hasData ? 'Device reconnected' : 'Device connected');
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

const provider: TelemetryProvider = new ArduinoTelemetryProvider();

function initState(): AppState {
  // Nothing is seeded: every manhole starts with an empty "no data" frame and
  // only ever shows values its device actually reported.
  const telemetry: Record<string, Telemetry> = {};
  const history: Record<string, Telemetry[]> = {};
  for (const m of MANHOLES) {
    telemetry[m.id] = emptyTelemetry(m.id);
    history[m.id] = [];
  }

  return {
    route: { page: 'live' },
    selectedId: 'MG-001',
    telemetry,
    history,
    bootTimes: {},
    alerts: [],
    settings: { pollMs: 2000, thresholds: DEFAULT_THRESHOLDS },
    now: Date.now(),
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
          now: Date.now(),
        }),
      });
    };
    poll();
    const t = window.setInterval(poll, state.settings.pollMs);
    return () => window.clearInterval(t);
  }, [state.settings.pollMs]);

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
