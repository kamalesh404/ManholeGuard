import type { Severity, StatusLevel } from '../model/types';

/** "2 seconds ago" / "5 minutes ago" */
export function formatAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** HH:MM:SS, 24h */
export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

/** "2h 14m" */
export function formatUptime(ms: number): string {
  if (ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  info: 'INFO',
  warning: 'WARNING',
  high: 'HIGH RISK',
  critical: 'CRITICAL',
};

export const SEVERITY_CLASS: Record<Severity, string> = {
  info: 'tone-info',
  warning: 'tone-warning',
  high: 'tone-high',
  critical: 'tone-critical',
};

export const STATUS_LABEL: Record<StatusLevel, string> = {
  safe: 'SAFE',
  warning: 'WARNING',
  high: 'HIGH RISK',
  critical: 'CRITICAL',
  offline: 'OFFLINE',
};

export const toneClass = (level: StatusLevel | 'ok'): string =>
  level === 'ok' ? 'tone-safe' : `tone-${level}`;

/**
 * Sensor values keep the precision the device actually sent: up to `maxDp`
 * decimals with trailing zeros trimmed, so whole numbers stay clean.
 *   412.35 → "412.35"  ·  412.30 → "412.3"  ·  420 → "420"
 */
export function fmtSensor(value: number | null | undefined, maxDp = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(maxDp).replace(/\.?0+$/, '');
}

/** Value display that never pretends raw counts are calibrated ppm. */
export function gasDisplay(value: number, unit: 'ppm' | 'raw'): string {
  return `${fmtSensor(value)} ${unit}`;
}
