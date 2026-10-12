/**
 * MANHOLEGUARD — core data model.
 *
 * These types describe the contract between the dashboard and any telemetry
 * source (live Arduino USB serial today; HTTP/MQTT gateways later). Values are
 * nullable — a device that never reported shows an honest "no data" state.
 * The UI is written against these types only — it never assumes example
 * values or a specific transport.
 */

/** Overall safety condition of a manhole. */
export type StatusLevel = 'safe' | 'warning' | 'high' | 'critical' | 'offline';

/** Severity used for alerts / log rows. */
export type Severity = 'info' | 'warning' | 'high' | 'critical';

/** Gas channel keys reported by the sensor module. */
export type GasKey = 'ch4' | 'co' | 'h2s';

/**
 * Unit of the gas values coming from the backend.
 *  - 'ppm' — backend provides calibrated ppm values.
 *  - 'raw' — backend provides uncalibrated ADC/sensor counts.
 * The UI must never label raw values as ppm.
 */
export type GasUnit = 'ppm' | 'raw';

export type CoverStatus = 'closed' | 'open';
export type VibrationState = 'normal' | 'detected';
export type DeviceStatus = 'online' | 'offline';
/** Link between a device and this dashboard (USB serial for Arduino nodes). */
export type LinkStatus = 'connected' | 'disconnected';

/** Alarm thresholds for one gas channel in one unit mode. */
export interface GasThreshold {
  warn: number;
  high: number;
  crit: number;
}

/** All configurable alarm thresholds. */
export interface Thresholds {
  gases: Record<GasKey, Record<GasUnit, GasThreshold>>;
  /** Water level thresholds as percentage of manhole depth. */
  waterWarnPct: number;
  waterHighPct: number;
  waterCritPct: number;
  /** Battery percentage below which the device is considered at risk. */
  batteryWarnPct: number;
}

/**
 * One telemetry frame produced by a device.
 * Every sensor field is nullable: null means the device has never reported
 * that channel (the UI must show an honest "—" / "no data", never a guess).
 */
export interface Telemetry {
  manholeId: string;
  /** Epoch ms when this frame was produced; 0 while the device is silent. */
  timestamp: number;
  /** False until the device has ever reported — no values are known yet. */
  hasData: boolean;
  gasUnit: GasUnit;
  ch4: number | null;
  co: number | null;
  h2s: number | null;
  /** Water depth reading in cm. */
  waterLevel: number | null;
  coverStatus: CoverStatus | null;
  vibration: VibrationState | null;
  /** Battery percentage 0–100; null = mains/USB powered (no battery fitted). */
  battery: number | null;
  linkStatus: LinkStatus;
  /** Transport detail, e.g. "USB serial · 9600 baud"; null when the link is down. */
  linkDetail: string | null;
  deviceStatus: DeviceStatus;
}

/** Physical IoT controller installed at a manhole (Arduino board). */
export interface Device {
  id: string;
  model: string;
  firmware: string;
  /** Gateway/heartbeat interval the device is expected to respect, ms. */
  heartbeatMs: number;
}

/** A monitored manhole (static configuration). */
export interface Manhole {
  id: string;
  name: string;
  /** Total shaft depth in cm — used to convert water cm ↔ percentage. */
  depthCm: number;
  /** Schematic position on the fleet map, 0–100 (not GPS coordinates). */
  mapPos: { x: number; y: number };
  device: Device;
}

/** Evaluation of a single sensor channel for display. */
export interface SensorEval {
  key: string;
  label: string;
  /** Numeric value, string value (cover/vibration), or null when unknown. */
  value: number | string | null;
  unit: string;
  level: StatusLevel;
  /** Short state word: Normal / Warning / High risk / Critical / Offline. */
  stateLabel: string;
  /** Human-readable explanation used in Current Risk. */
  detail: string;
}

/** One line in the Current Risk panel. */
export interface RiskLine {
  tone: 'ok' | 'warning' | 'high' | 'critical' | 'offline';
  text: string;
}

/** Result of evaluating a telemetry frame against thresholds. */
export interface RiskAssessment {
  status: StatusLevel;
  headline: string;
  subtitle: string;
  lines: RiskLine[];
  sensors: SensorEval[];
}

/** An event raised when a sensor or device changes state. */
export interface Alert {
  id: string;
  manholeId: string;
  severity: Severity;
  /** Short human sentence explaining the event. */
  message: string;
  timestamp: number;
  acknowledged: boolean;
}
