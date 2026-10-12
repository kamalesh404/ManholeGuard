import type { Manhole } from '../model/types';

/**
 * Static fleet configuration — the registered manholes and their devices.
 *
 * In a deployment these rows would come from the provisioning backend;
 * they are kept separate from telemetry so the UI never hard-codes values.
 * No telemetry is seeded: a manhole shows "no data" until its device
 * actually reports.
 */
export const MANHOLES: Manhole[] = [
  {
    id: 'MG-001',
    name: 'Main Gate Road',
    depthCm: 100,
    mapPos: { x: 24, y: 34 },
    device: { id: 'MG-001', model: 'Arduino Uno', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-002',
    name: 'Bus Stand',
    depthCm: 90,
    mapPos: { x: 47, y: 20 },
    device: { id: 'MG-002', model: 'Arduino Uno', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-003',
    name: 'Market Road',
    depthCm: 110,
    mapPos: { x: 70, y: 44 },
    device: { id: 'MG-003', model: 'Arduino Uno', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-004',
    name: 'College Road',
    depthCm: 95,
    mapPos: { x: 35, y: 68 },
    device: { id: 'MG-004', model: 'Arduino Uno', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-005',
    name: 'Railway Road',
    depthCm: 120,
    mapPos: { x: 62, y: 80 },
    device: { id: 'MG-005', model: 'Arduino Uno', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
  {
    id: 'MG-006',
    name: 'Hospital Lane',
    depthCm: 100,
    mapPos: { x: 85, y: 16 },
    device: { id: 'MG-006', model: 'Arduino Uno', firmware: 'v0.1.0', heartbeatMs: 10_000 },
  },
];
