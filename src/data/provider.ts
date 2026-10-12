import type { Manhole, Telemetry } from '../model/types';

/**
 * TelemetryProvider is the seam between the dashboard and a data source.
 *
 * The app runs `ArduinoTelemetryProvider` (live USB serial). Any other source
 * — HTTP gateway, MQTT bridge — only has to return the same Telemetry shape:
 * no UI changes required. There is no simulation: a manhole whose device has
 * never reported keeps an empty frame and renders as "no data".
 */
export interface TelemetryProvider {
  readonly label: string;
  poll(ctx: PollContext): Record<string, Telemetry>;
}

export interface PollContext {
  manholes: Manhole[];
  /** Latest frame per manhole (frozen while a device is silent). */
  previous: Record<string, Telemetry>;
  now: number;
}

/**
 * Frame for a manhole whose device has never reported: every value is null
 * and hasData is false, so the UI shows honest "no data" states instead of
 * fabricated numbers.
 */
export function emptyTelemetry(manholeId: string): Telemetry {
  return {
    manholeId,
    timestamp: 0,
    hasData: false,
    gasUnit: 'ppm',
    ch4: null,
    co: null,
    h2s: null,
    waterLevel: null,
    coverStatus: null,
    vibration: null,
    battery: null,
    linkStatus: 'disconnected',
    linkDetail: null,
    deviceStatus: 'offline',
  };
}
