import type { Manhole, Scenario, Telemetry, Alert } from '../model/types';

/**
 * Static fleet configuration.
 *
 * In a deployment these rows would come from the provisioning backend;
 * they are kept separate from telemetry so the UI never hard-codes values.
 */
export const MANHOLES: Manhole[] = [
  {
    id: 'MG-001',
    name: 'Main Gate Road',
    depthCm: 100,
    mapPos: { x: 24, y: 34 },
    device: { id: 'MG-001', model: 'ESP32-C3', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-002',
    name: 'Bus Stand',
    depthCm: 90,
    mapPos: { x: 47, y: 20 },
    device: { id: 'MG-002', model: 'ESP32-C3', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-003',
    name: 'Market Road',
    depthCm: 110,
    mapPos: { x: 70, y: 44 },
    device: { id: 'MG-003', model: 'ESP32-C3', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-004',
    name: 'College Road',
    depthCm: 95,
    mapPos: { x: 35, y: 68 },
    device: { id: 'MG-004', model: 'ESP32-C3', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-005',
    name: 'Railway Road',
    depthCm: 120,
    mapPos: { x: 62, y: 80 },
    device: { id: 'MG-005', model: 'ESP32-C3', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-006',
    name: 'Hospital Lane',
    depthCm: 100,
    mapPos: { x: 85, y: 16 },
    device: { id: 'MG-006', model: 'ESP32-C3', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
];

/** Initial demo scenario per manhole (matches the fleet status overview). */
export const INITIAL_SCENARIOS: Record<string, Scenario> = {
  'MG-001': 'safe',
  'MG-002': 'warning',
  'MG-003': 'critical',
  'MG-004': 'safe',
  'MG-005': 'offline',
  'MG-006': 'safe',
};

/** Battery level per manhole at first frame (%). */
export const INITIAL_BATTERY: Record<string, number> = {
  'MG-001': 82,
  'MG-002': 67,
  'MG-003': 31,
  'MG-004': 91,
  'MG-005': 8,
  'MG-006': 76,
};

/** Device boot time per manhole (epoch ms) — drives the uptime readout. */
export function initialBootTimes(now: number): Record<string, number> {
  return {
    'MG-001': now - (2 * 3600 + 14 * 60) * 1000,
    'MG-002': now - (9 * 3600 + 41 * 60) * 1000,
    'MG-003': now - (5 * 3600 + 7 * 60) * 1000,
    'MG-004': now - (26 * 3600 + 12 * 60) * 1000,
    'MG-005': now - (3 * 3600 + 55 * 60) * 1000,
    'MG-006': now - (14 * 3600 + 3 * 60) * 1000,
  };
}

/** Seed alert log so the alerts panel is populated on first paint. */
export function seedAlerts(now: number): Alert[] {
  const at = (secondsAgo: number) => now - secondsAgo * 1000;
  return [
    {
      id: 'seed-1',
      manholeId: 'MG-003',
      severity: 'critical',
      message: 'Water level critical — 101 cm (92%) above critical threshold',
      timestamp: at(96),
      acknowledged: false,
    },
    {
      id: 'seed-2',
      manholeId: 'MG-003',
      severity: 'critical',
      message: 'H₂S 32 ppm above critical threshold (25)',
      timestamp: at(240),
      acknowledged: false,
    },
    {
      id: 'seed-3',
      manholeId: 'MG-002',
      severity: 'warning',
      message: 'CO 36 ppm above warning threshold (30)',
      timestamp: at(431),
      acknowledged: false,
    },
    {
      id: 'seed-4',
      manholeId: 'MG-005',
      severity: 'critical',
      message: 'Device offline — heartbeat lost',
      timestamp: at(844),
      acknowledged: false,
    },
    {
      id: 'seed-5',
      manholeId: 'MG-001',
      severity: 'info',
      message: 'Device reconnected',
      timestamp: at(1180),
      acknowledged: true,
    },
    {
      id: 'seed-6',
      manholeId: 'MG-004',
      severity: 'info',
      message: 'Firmware v0.1.0 heartbeat OK',
      timestamp: at(1745),
      acknowledged: true,
    },
  ];
}

/** Initial telemetry snapshot so the UI has data before the first poll. */
export function initialTelemetry(
  scenarios: Record<string, Scenario>,
  now: number,
  build: (id: string, scenario: Scenario, timestamp: number) => Telemetry,
): Record<string, Telemetry> {
  const out: Record<string, Telemetry> = {};
  for (const m of MANHOLES) {
    const scenario = scenarios[m.id] ?? 'safe';
    // Offline devices keep their last known frame, aged into the past.
    const ts = scenario === 'offline' ? now - 14 * 60 * 1000 : now;
    out[m.id] = build(m.id, scenario, ts);
  }
  return out;
}
