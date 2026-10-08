import type { GasKey, Manhole, Scenario, Telemetry } from '../model/types';
import { INITIAL_BATTERY } from './seed';

/**
 * TelemetryProvider is the seam between the dashboard and a data source.
 *
 * The UI only ever calls `poll()`. Today the app runs `SimulatedTelemetryProvider`;
 * later this can be replaced by e.g. `HttpTelemetryProvider` that reads
 * `GET /api/telemetry` (or an MQTT bridge) returning the same Telemetry shape
 * produced by the ESP32-C3 firmware — no UI changes required.
 */
export interface TelemetryProvider {
  readonly kind: 'simulated' | 'live';
  readonly label: string;
  poll(ctx: PollContext): Record<string, Telemetry>;
}

export interface PollContext {
  manholes: Manhole[];
  /** Latest frame per manhole (used to freeze values while a device is offline). */
  previous: Record<string, Telemetry>;
  /** Forced demo scenario per manhole. */
  scenarios: Record<string, Scenario>;
  /** Unit mode requested by settings. */
  gasUnit: 'ppm' | 'raw';
  now: number;
}

/* ------------------------------------------------------------------ */
/* Simulated provider                                                  */
/* ------------------------------------------------------------------ */

interface Baseline {
  /** ppm baselines */
  ppm: Record<GasKey, number>;
  /** raw ADC baselines */
  raw: Record<GasKey, number>;
  /** fraction of shaft depth filled with water */
  water: number;
  temperature: number;
  humidity: number;
  cover: Telemetry['coverStatus'];
  vibration: Telemetry['vibration'];
}

const BASELINES: Record<Exclude<Scenario, 'offline'>, Baseline> = {
  safe: {
    ppm: { ch4: 420, co: 12, h2s: 4 },
    raw: { ch4: 1180, co: 640, h2s: 430 },
    water: 0.32,
    temperature: 29.4,
    humidity: 74,
    cover: 'closed',
    vibration: 'normal',
  },
  warning: {
    ppm: { ch4: 1120, co: 36, h2s: 13 },
    raw: { ch4: 1930, co: 1680, h2s: 1470 },
    water: 0.66,
    temperature: 30.6,
    humidity: 81,
    cover: 'closed',
    vibration: 'normal',
  },
  high: {
    ppm: { ch4: 1920, co: 74, h2s: 21 },
    raw: { ch4: 2410, co: 2230, h2s: 2350 },
    water: 0.8,
    temperature: 31.8,
    humidity: 86,
    cover: 'open',
    vibration: 'normal',
  },
  critical: {
    ppm: { ch4: 2850, co: 132, h2s: 32 },
    raw: { ch4: 3210, co: 3080, h2s: 3450 },
    water: 0.92,
    temperature: 33.2,
    humidity: 92,
    cover: 'closed',
    vibration: 'detected',
  },
};

const jitter = (base: number, pct: number) => {
  const span = Math.max(1, Math.abs(base) * pct);
  return base + (Math.random() * 2 - 1) * span;
};
const round = (v: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/**
 * Produces realistic, noisy telemetry for every manhole.
 * Values drift slightly around the baseline of the manhole's scenario so the
 * dashboard feels alive while the overall safety state stays deterministic.
 */
export class SimulatedTelemetryProvider implements TelemetryProvider {
  readonly kind = 'simulated' as const;
  readonly label = 'Simulated telemetry';

  /** Batteries only drain — keeps the low-battery state from flapping. */
  private battery = new Map<string, number>();

  private batteryFor(id: string, online: boolean): number {
    const start = this.battery.get(id) ?? INITIAL_BATTERY[id] ?? 70;
    const next = online ? Math.max(4, start - Math.random() * 0.01) : start;
    this.battery.set(id, next);
    return Math.round(next);
  }

  poll(ctx: PollContext): Record<string, Telemetry> {
    const out: Record<string, Telemetry> = {};

    for (const m of ctx.manholes) {
      const scenario = ctx.scenarios[m.id] ?? 'safe';

      if (scenario === 'offline') {
        // A device that stopped reporting keeps its last frame untouched —
        // the UI derives staleness from the frame timestamp.
        const prev = ctx.previous[m.id];
        if (prev) {
          out[m.id] = { ...prev, deviceStatus: 'offline', wifiStatus: 'disconnected', signalStrength: null };
          continue;
        }
      }

      const b = BASELINES[scenario === 'offline' ? 'safe' : scenario];
      const gases = ctx.gasUnit === 'ppm' ? b.ppm : b.raw;

      out[m.id] = {
        manholeId: m.id,
        timestamp: ctx.now,
        gasUnit: ctx.gasUnit,
        ch4: Math.round(jitter(gases.ch4, 0.04)),
        co: Math.round(jitter(gases.co, 0.06)),
        h2s: Math.round(jitter(gases.h2s, 0.07)),
        waterLevel: Math.min(
          m.depthCm,
          round(Math.max(0, jitter(b.water * m.depthCm, 0.03)), 0),
        ),
        temperature: round(jitter(b.temperature, 0.02), 1),
        humidity: Math.min(100, Math.max(20, Math.round(jitter(b.humidity, 0.03)))),
        coverStatus: b.cover,
        vibration: b.vibration,
        battery: this.batteryFor(m.id, true),
        wifiStatus: 'connected',
        signalStrength: Math.round(jitter(-61, 0.12)),
        deviceStatus: 'online',
      };
    }

    return out;
  }
}

/** Build a single frame directly — used for the first paint before polling. */
export function buildFrame(
  provider: TelemetryProvider,
  manholes: Manhole[],
  scenarios: Record<string, Scenario>,
  gasUnit: 'ppm' | 'raw',
  now: number,
): Record<string, Telemetry> {
  return provider.poll({ manholes, previous: {}, scenarios, gasUnit, now });
}
