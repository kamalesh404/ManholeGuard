import type { CoverStatus, GasKey, GasUnit, Telemetry, VibrationState } from '../model/types';
import { emptyTelemetry, type PollContext, type TelemetryProvider } from './provider';

/**
 * LIVE Arduino feed (Web Serial) — MG-001 only.
 *
 * There is no simulation anywhere in the app: a manhole whose device has
 * never reported keeps an empty frame (hasData false) and renders as
 * "no data" instead of fabricated numbers.
 *
 * The dashboard only calls `poll()` — the single seam for every data source —
 * so no UI/page code has to change.
 *
 * --- Wire format -------------------------------------------------------
 * The Arduino prints ONE line per reading over USB serial, e.g.
 *
 *   {"gasUnit":"raw","ch4":1180,"co":640,"h2s":430,"waterLevel":32}
 *
 * Accepted line formats (first match wins):
 *   1. JSON           any subset of ch4, co, h2s, waterLevel, coverStatus,
 *                     vibration, battery + gasUnit        (full frame)
 *   2. key / value    ch4:1180 co:640 water:32            (= also works)
 *   3. CSV / spaces   1180,640,430                         (gases only)
 *
 * Plain serial-monitor text works as-is, e.g. a sketch that prints:
 *   CH4: 420.00 ppm  CO: 12.00 ppm  H2S: 4.00 ppm
 * ("ppm" in the line marks the unit; without it values stay raw ADC.)
 * Missing fields fall back to the previous reading.
 *
 * Baud is auto-detected: the port opens at 9600 (the Arduino default) and
 * falls back to 115200 when no parseable line arrives within PROBE_MS.
 *
 * HONESTY RULE: a line without an explicit unit token ("gasUnit":"ppm", or
 * a trailing "ppm") is treated as RAW ADC — raw MQ counts are never
 * displayed as calibrated ppm.
 */

export const LIVE_MANHOLE_ID = 'MG-001';
/** Baud rates probed in order — 9600 first (Arduino default), then 115200. */
export const BAUD_CANDIDATES = [9600, 115200];
/** A baud gets this long to produce a parseable line before the next is tried. */
const PROBE_MS = 5_000;
/** No line for this long while connected → treat the device as offline. */
const STALE_MS = 10_000;

/* ------------------------------------------------------------------ */
/* Line parsing                                                        */
/* ------------------------------------------------------------------ */

export interface LiveReading {
  ch4: number | null;
  co: number | null;
  h2s: number | null;
  /** Water depth in cm — null when the line doesn't carry it. */
  waterLevel: number | null;
  coverStatus: CoverStatus | null;
  vibration: VibrationState | null;
  /** Battery % reported by the device — null means USB powered / not reported. */
  battery: number | null;
  unit: GasUnit;
  /** Epoch ms when the line was received from the serial port. */
  at: number;
}

const GAS_ALIASES: Record<string, GasKey> = {
  ch4: 'ch4',
  methane: 'ch4',
  ch: 'ch4',
  mq4: 'ch4',
  co: 'co',
  carbonmonoxide: 'co',
  h2s: 'h2s',
  hydrogensulfide: 'h2s',
  mq136: 'h2s',
};

const WATER_ALIASES = new Set(['water', 'waterlevel', 'level', 'depth', 'ultrasonic']);

const coverOf = (v: unknown): CoverStatus | null => {
  const s = String(v ?? '').toLowerCase();
  if (['open', 'true', '1', 'lifted'].includes(s)) return 'open';
  if (['closed', 'close', 'shut', 'false', '0', 'secure'].includes(s)) return 'closed';
  return null;
};

const vibOf = (v: unknown): VibrationState | null => {
  const s = String(v ?? '').toLowerCase();
  if (['detected', 'true', '1', 'tamper', 'impact'].includes(s)) return 'detected';
  if (['normal', 'false', '0', 'none', 'idle'].includes(s)) return 'normal';
  return null;
};

const fromNumberish = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

/** Only an explicit "ppm" is ppm — every other unit string stays honestly RAW. */
function unitOf(raw: unknown): GasUnit {
  const s = String(raw ?? '').toLowerCase();
  return s.includes('ppm') ? 'ppm' : 'raw';
}

function pickUnit(obj: Record<string, unknown>): GasUnit {
  for (const k of ['unit', 'gasUnit', 'mode', 'type']) {
    if (obj[k] !== undefined) return unitOf(obj[k]);
  }
  if (obj.ppm === true) return 'ppm';
  return 'raw';
}

function fromObject(obj: Record<string, unknown>, at: number): LiveReading | null {
  const out: LiveReading = {
    ch4: null,
    co: null,
    h2s: null,
    waterLevel: null,
    coverStatus: null,
    vibration: null,
    battery: null,
    unit: pickUnit(obj),
    at,
  };
  let recognised = false;
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const gas = GAS_ALIASES[key];
    if (gas) {
      out[gas] = fromNumberish(v);
      recognised = true;
      continue;
    }
    if (WATER_ALIASES.has(key)) {
      out.waterLevel = fromNumberish(v);
      recognised = true;
      continue;
    }
    if (key === 'cover' || key === 'coverstatus') {
      out.coverStatus = coverOf(v);
      recognised = true;
      continue;
    }
    if (key === 'vibration' || key === 'vib' || key === 'tamper') {
      out.vibration = vibOf(v);
      recognised = true;
      continue;
    }
    if (key === 'battery' || key === 'batt' || key === 'vbat') {
      out.battery = fromNumberish(v);
      recognised = true;
    }
  }
  return recognised ? out : null;
}

/** Parse one line printed by the Arduino. Returns null for noise/banner lines. */
export function parseReading(line: string): LiveReading | null {
  const text = line.trim().replace(/^[>#$]\s*/, '');
  if (!text) return null;
  const at = Date.now();

  // 1. JSON
  if (text.startsWith('{')) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>;
      const reading = fromObject(obj, at);
      if (reading) return reading;
    } catch {
      /* fall through to the other formats */
    }
  }

  // 2. key:value / key=value pairs
  const kv =
    /\b([a-z][a-z0-9_]*)\s*[:=]\s*(-?\d+(?:\.\d+)?)(?=[^a-z0-9]|$)/gi;
  const found: Partial<Record<GasKey, number>> = {};
  let water: number | null = null;
  let unit: GasUnit = /\bppm\b/i.test(text) ? 'ppm' : 'raw';
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = kv.exec(text)) !== null) {
    matched = true;
    const key = m[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const gas = GAS_ALIASES[key];
    if (gas) {
      found[gas] = Number(m[2]);
      continue;
    }
    if (WATER_ALIASES.has(key)) water = Number(m[2]);
  }
  if (matched) {
    if (/\bunit\s*[:=]/i.test(text)) unit = unitOf(text.replace(/^.*?\bunit\s*[:=]\s*/i, ''));
    if (found.ch4 === undefined && found.co === undefined && found.h2s === undefined && water === null) return null;
    return {
      ch4: found.ch4 ?? null,
      co: found.co ?? null,
      h2s: found.h2s ?? null,
      waterLevel: water,
      coverStatus: null,
      vibration: null,
      battery: null,
      unit,
      at,
    };
  }

  // 3. CSV / whitespace separated numbers: ch4,co,h2s
  // Reject anything still containing letters (banner lines like
  // "MQ-4 boot v0.1.0 ready") so noise can never be read as a gas value.
  const wantsPpm = /\bppm\b/i.test(text);
  const cleaned = text.replace(/\b(raw|adc|ppm)\b/gi, '').trim();
  if (!cleaned || !/^[-\d\s.,;]+$/.test(cleaned)) return null;
  const nums = cleaned.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length === 0 || nums.length > 3) return null;
  const [ch4, co, h2s] = nums;
  return {
    ch4: ch4 ?? null,
    co: co ?? null,
    h2s: h2s ?? null,
    waterLevel: null,
    coverStatus: null,
    vibration: null,
    battery: null,
    unit: wantsPpm ? 'ppm' : 'raw',
    at,
  };
}

/* ------------------------------------------------------------------ */
/* Web Serial transport                                                */
/* ------------------------------------------------------------------ */

export type SerialState =
  | 'unsupported'
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'lost'
  | 'error';

export interface ArduinoStatus {
  state: SerialState;
  message: string;
  lastReadingAt: number | null;
}

interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
}

interface SerialLike {
  requestPort(options?: unknown): Promise<SerialPortLike>;
}

function serialApi(): SerialLike | null {
  return (navigator as Navigator & { serial?: SerialLike }).serial ?? null;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

/**
 * Sole data source: real readings for MG-001 over USB serial.
 *
 * Every other manhole (and MG-001 before the Arduino is connected) keeps the
 * empty frame from `emptyTelemetry()` — no values are ever invented. When the
 * device goes silent, its last real frame is frozen and marked offline.
 */
export class ArduinoTelemetryProvider implements TelemetryProvider {
  readonly label = `Arduino USB serial · ${LIVE_MANHOLE_ID}`;

  private reading: LiveReading | null = null;
  private port: SerialPortLike | null = null;
  private keepReading = false;
  /** Baud of the open port — first candidate until detection proves otherwise. */
  private baud = BAUD_CANDIDATES[0];
  private baudIndex = 0;
  /** Set once at least one parseable line has arrived on this connection. */
  private confirmed = false;
  private probeTimer = 0;
  /** Bumped on every connect/disconnect so stale probes and loops stand down. */
  private epoch = 0;
  private loopId = 0;
  private status: ArduinoStatus = {
    state: typeof navigator !== 'undefined' && serialApi() ? 'idle' : 'unsupported',
    message:
      typeof navigator !== 'undefined' && serialApi()
        ? 'Arduino not connected'
        : 'Web Serial needs Chrome/Edge on http://localhost',
    lastReadingAt: null,
  };
  private listeners = new Set<(s: ArduinoStatus) => void>();

  /* -- status plumbing for the connect button ------------------------ */

  getStatus(): ArduinoStatus {
    return this.status;
  }

  subscribe(fn: (s: ArduinoStatus) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private setStatus(patch: Partial<ArduinoStatus>) {
    this.status = { ...this.status, ...patch };
    for (const fn of this.listeners) fn(this.status);
  }

  /* -- transport ----------------------------------------------------- */

  async connect(): Promise<void> {
    const api = serialApi();
    if (!api) {
      this.setStatus({ state: 'unsupported', message: 'Web Serial not available in this browser' });
      return;
    }
    this.setStatus({ state: 'connecting', message: 'Waiting for port selection…' });
    try {
      const port = await api.requestPort();
      this.epoch += 1;
      this.baudIndex = 0;
      this.confirmed = false;
      await this.openAt(port, this.epoch, true);
    } catch (err) {
      this.setStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Serial connection failed',
      });
    }
  }

  /**
   * Open the port at the current baud candidate, start reading, and arm a
   * probe that advances to the next candidate if no parseable line arrives.
   */
  private async openAt(port: SerialPortLike, epoch: number, probe: boolean): Promise<void> {
    const baud = BAUD_CANDIDATES[this.baudIndex];
    await port.open({ baudRate: baud });
    this.baud = baud;
    this.port = port;
    this.keepReading = true;
    this.setStatus({
      state: 'connected',
      message: `Serial open at ${baud} baud — detecting device…`,
      lastReadingAt: null,
    });
    void this.readLoop(port, epoch);
    if (probe) this.scheduleProbe(port, epoch);
  }

  /** No parseable line within PROBE_MS → close and retry at the next baud. */
  private scheduleProbe(port: SerialPortLike, epoch: number): void {
    window.clearTimeout(this.probeTimer);
    this.probeTimer = window.setTimeout(() => {
      if (epoch !== this.epoch || this.confirmed || !this.keepReading) return;
      void this.probeNextBaud(port, epoch);
    }, PROBE_MS);
  }

  private async probeNextBaud(port: SerialPortLike, epoch: number): Promise<void> {
    // Stops the current readLoop without raising an "unplugged" alarm.
    this.keepReading = false;
    try {
      await port.close();
    } catch {
      /* port already gone */
    }
    this.baudIndex += 1;

    if (this.baudIndex >= BAUD_CANDIDATES.length) {
      // Every candidate went quiet: reopen the first baud, stop cycling and
      // wait — the user may still be flashing firmware.
      this.baudIndex = 0;
      try {
        await this.openAt(port, epoch, false);
        this.setStatus({
          state: 'connected',
          message: `No readable data at ${BAUD_CANDIDATES.join('/')} baud — check Serial.begin() in the firmware`,
        });
      } catch {
        this.setStatus({ state: 'error', message: 'Serial connection failed' });
      }
      return;
    }

    try {
      await this.openAt(port, epoch, true);
    } catch (err) {
      this.setStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Serial connection failed',
      });
    }
  }

  async disconnect(): Promise<void> {
    this.epoch += 1;
    window.clearTimeout(this.probeTimer);
    this.keepReading = false;
    try {
      await this.port?.close();
    } catch {
      /* port already gone */
    }
    this.port = null;
    this.setStatus({
      state: 'idle',
      message: this.reading ? 'Demo feed (last live reading kept)' : 'Arduino not connected',
    });
  }

  private async readLoop(port: SerialPortLike, epoch: number): Promise<void> {
    const loop = ++this.loopId;
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (this.keepReading && loop === this.loopId) {
        const reader = port.readable?.getReader();
        if (!reader) break;
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            if (!value) continue;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';
            for (const line of lines) this.ingest(line);
          }
        } finally {
          reader.releaseLock();
        }
        break;
      }
    } catch {
      /* unplugged mid-read */
    }
    if (this.keepReading && loop === this.loopId && epoch === this.epoch) {
      this.keepReading = false;
      this.port = null;
      this.setStatus({
        state: 'lost',
        message: this.reading
          ? 'Arduino unplugged — showing last live reading'
          : 'Arduino disconnected',
      });
    }
  }

  private ingest(line: string): void {
    const next = parseReading(line);
    if (!next) return;
    const prev = this.reading;
    this.reading = {
      ch4: next.ch4 ?? prev?.ch4 ?? null,
      co: next.co ?? prev?.co ?? null,
      h2s: next.h2s ?? prev?.h2s ?? null,
      waterLevel: next.waterLevel ?? prev?.waterLevel ?? null,
      coverStatus: next.coverStatus ?? prev?.coverStatus ?? null,
      vibration: next.vibration ?? prev?.vibration ?? null,
      battery: next.battery ?? prev?.battery ?? null,
      unit: next.unit,
      at: next.at,
    };
    if (!this.confirmed) {
      // First parseable line — this baud is the right one; stop probing.
      this.confirmed = true;
      window.clearTimeout(this.probeTimer);
    }
    this.setStatus({
      state: 'connected',
      message: `Serial live · ${this.baud} baud`,
      lastReadingAt: next.at,
    });
  }

  /* -- TelemetryProvider --------------------------------------------- */

  poll(ctx: PollContext): Record<string, Telemetry> {
    const out: Record<string, Telemetry> = {};

    for (const m of ctx.manholes) {
      const prev = ctx.previous[m.id];

      if (m.id !== LIVE_MANHOLE_ID || !this.reading) {
        // No live source for this node: keep its last real frame, else "no data".
        out[m.id] = prev ?? emptyTelemetry(m.id);
        continue;
      }

      const reading = this.reading;
      const frame = prev?.hasData ? prev : emptyTelemetry(m.id);
      const fresh = Date.now() - reading.at <= STALE_MS;
      const gases: Record<GasKey, number | null> = {
        ch4: reading.ch4,
        co: reading.co,
        h2s: reading.h2s,
      };

      out[LIVE_MANHOLE_ID] = {
        ...frame,
        hasData: true,
        gasUnit: reading.unit,
        ch4: gases.ch4 ?? frame.ch4,
        co: gases.co ?? frame.co,
        h2s: gases.h2s ?? frame.h2s,
        ...(reading.waterLevel !== null ? { waterLevel: reading.waterLevel } : {}),
        ...(reading.coverStatus !== null ? { coverStatus: reading.coverStatus } : {}),
        ...(reading.vibration !== null ? { vibration: reading.vibration } : {}),
        // A live board is USB powered unless its firmware reports a battery.
        battery: reading.battery,
        // The frame timestamp always follows the real sensor, so "last telemetry"
        // reflects the Arduino.
        timestamp: reading.at,
        ...(fresh
          ? {
              deviceStatus: 'online' as const,
              linkStatus: 'connected' as const,
              linkDetail: `USB serial · ${this.baud} baud`,
            }
          : {
              deviceStatus: 'offline' as const,
              linkStatus: 'disconnected' as const,
              linkDetail: null,
            }),
      };
    }
    return out;
  }
}
