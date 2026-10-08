import type {
  GasKey,
  Manhole,
  RiskAssessment,
  SensorEval,
  StatusLevel,
  Telemetry,
  Thresholds,
} from './types';

/** Default alarm thresholds. Values are configurable on the Settings page. */
export const DEFAULT_THRESHOLDS: Thresholds = {
  gases: {
    // Calibrated ppm bands — plausible MQ-series alarm bands for a confined space.
    ch4: { ppm: { warn: 800, high: 1500, crit: 2400 }, raw: { warn: 1700, high: 2300, crit: 2900 } },
    co: { ppm: { warn: 30, high: 60, crit: 100 }, raw: { warn: 1500, high: 2100, crit: 2900 } },
    h2s: { ppm: { warn: 10, high: 18, crit: 25 }, raw: { warn: 1300, high: 2200, crit: 3000 } },
  },
  waterWarnPct: 60,
  waterHighPct: 75,
  waterCritPct: 88,
  batteryWarnPct: 30,
};

export const LEVEL_RANK: Record<StatusLevel, number> = {
  safe: 0,
  warning: 1,
  high: 2,
  critical: 3,
  offline: 4,
};

export const maxLevel = (a: StatusLevel, b: StatusLevel): StatusLevel =>
  LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;

export const GAS_LABELS: Record<GasKey, { symbol: string; name: string }> = {
  ch4: { symbol: 'CH₄', name: 'Methane' },
  co: { symbol: 'CO', name: 'Carbon Monoxide' },
  h2s: { symbol: 'H₂S', name: 'Hydrogen Sulfide' },
};

export const STATE_WORD: Record<StatusLevel, string> = {
  safe: 'Normal',
  warning: 'Warning',
  high: 'High risk',
  critical: 'Critical',
  offline: 'Offline',
};

const num = (v: number, digits = 0) =>
  v.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/** Classify a gas reading against its configured band. */
export function gasLevel(value: number, warn: number, high: number, crit: number): StatusLevel {
  if (value >= crit) return 'critical';
  if (value >= high) return 'high';
  if (value >= warn) return 'warning';
  return 'safe';
}

export function waterPct(t: Telemetry, m: Manhole): number {
  if (m.depthCm <= 0) return 0;
  return Math.min(100, Math.round((t.waterLevel / m.depthCm) * 100));
}

/**
 * Evaluate every channel of one telemetry frame.
 *
 * Returns per-sensor states plus an overall assessment that answers
 * "is this manhole safe right now?" and "why?".
 */
export function assess(t: Telemetry, m: Manhole, th: Thresholds): RiskAssessment {
  const offline = t.deviceStatus === 'offline';
  const sensors: SensorEval[] = [];
  const lines: RiskAssessment['lines'] = [];

  const unitWord = t.gasUnit === 'ppm' ? 'ppm' : 'raw';
  const compareWord = t.gasUnit === 'ppm' ? '' : ' (raw ADC)';

  // --- Gases -------------------------------------------------------------
  (['ch4', 'co', 'h2s'] as GasKey[]).forEach((key) => {
    const meta = GAS_LABELS[key];
    const band = th.gases[key][t.gasUnit];
    const value = t[key];
    const level: StatusLevel = offline ? 'offline' : gasLevel(value, band.warn, band.high, band.crit);
    sensors.push({
      key,
      label: meta.symbol,
      value,
      unit: unitWord,
      level,
      stateLabel: STATE_WORD[level],
      detail:
        level === 'safe'
          ? `${meta.symbol} level normal`
          : `${meta.symbol} ${num(value)} ${unitWord} above ${
              level === 'critical' ? 'critical' : level === 'high' ? 'high-risk' : 'warning'
            } threshold (${num(level === 'critical' ? band.crit : level === 'high' ? band.high : band.warn)})${compareWord}`,
    });
    if (level === 'safe') {
      lines.push({ tone: 'ok', text: `${meta.symbol} gas level normal` });
    } else if (level === 'offline') {
      lines.push({ tone: 'offline', text: `${meta.symbol} — device offline, last known ${num(value)} ${unitWord}` });
    } else {
      lines.push({ tone: level, text: `${meta.symbol} ${num(value)} ${unitWord} above ${level === 'critical' ? 'critical' : level === 'high' ? 'high-risk' : 'warning'} threshold (${num(level === 'critical' ? band.crit : level === 'high' ? band.high : band.warn)})${compareWord}` });
    }
  });

  // --- Water -------------------------------------------------------------
  const pct = waterPct(t, m);
  const waterLevel: StatusLevel = offline
    ? 'offline'
    : pct >= th.waterCritPct
      ? 'critical'
      : pct >= th.waterHighPct
        ? 'high'
        : pct >= th.waterWarnPct
          ? 'warning'
          : 'safe';
  sensors.push({
    key: 'water',
    label: 'Water level',
    value: pct,
    unit: '%',
    level: waterLevel,
    stateLabel: STATE_WORD[waterLevel],
    detail:
      waterLevel === 'safe'
        ? `Water level normal (${num(t.waterLevel)} cm of ${m.depthCm} cm)`
        : `Water level ${num(t.waterLevel)} cm (${pct}%) above ${
            waterLevel === 'critical' ? 'critical' : waterLevel === 'high' ? 'high-risk' : 'warning'
          } threshold (${th.waterCritPct}%)`,
  });
  lines.push(
    waterLevel === 'safe'
      ? { tone: 'ok', text: `Water level normal (${num(t.waterLevel)} cm · ${pct}%)` }
      : {
          tone: waterLevel,
          text: `Water level ${num(t.waterLevel)} cm (${pct}%) above ${
            waterLevel === 'critical' ? 'critical' : waterLevel === 'high' ? 'high-risk' : 'warning'
          } threshold (${waterLevel === 'critical' ? th.waterCritPct : waterLevel === 'high' ? th.waterHighPct : th.waterWarnPct}%)`,
        },
  );

  // --- Cover -------------------------------------------------------------
  const coverLevel: StatusLevel = offline ? 'offline' : t.coverStatus === 'open' ? 'warning' : 'safe';
  sensors.push({
    key: 'cover',
    label: 'Manhole cover',
    value: t.coverStatus,
    unit: '',
    level: coverLevel,
    stateLabel: t.coverStatus === 'open' ? 'Open' : 'Closed',
    detail: t.coverStatus === 'open' ? 'Manhole cover is open' : 'Cover secured',
  });
  lines.push(
    t.coverStatus === 'open'
      ? { tone: 'warning', text: 'Manhole cover is open — unauthorized access possible' }
      : { tone: 'ok', text: 'Cover secured' },
  );

  // --- Vibration / tamper ------------------------------------------------
  const vibLevel: StatusLevel = offline ? 'offline' : t.vibration === 'detected' ? 'warning' : 'safe';
  sensors.push({
    key: 'vibration',
    label: 'Vibration / tamper',
    value: t.vibration,
    unit: '',
    level: vibLevel,
    stateLabel: t.vibration === 'detected' ? 'Activity detected' : 'Normal',
    detail: t.vibration === 'detected' ? 'Vibration / tamper activity detected' : 'No unusual activity',
  });
  lines.push(
    t.vibration === 'detected'
      ? { tone: 'warning', text: 'Vibration / tamper activity detected' }
      : { tone: 'ok', text: 'No unusual vibration' },
  );

  // --- Battery -----------------------------------------------------------
  const battLevel: StatusLevel = offline
    ? 'offline'
    : t.battery <= th.batteryWarnPct
      ? 'warning'
      : 'safe';
  sensors.push({
    key: 'battery',
    label: 'Battery',
    value: t.battery,
    unit: '%',
    level: battLevel,
    stateLabel: battLevel === 'safe' ? 'Normal' : 'Low',
    detail: `Battery at ${num(t.battery)}%${battLevel === 'warning' ? ` — below ${th.batteryWarnPct}% threshold` : ''}`,
  });
  if (battLevel === 'warning') {
    lines.push({ tone: 'warning', text: `Battery at ${num(t.battery)}% — below ${th.batteryWarnPct}% threshold` });
  } else if (!offline) {
    lines.push({ tone: 'ok', text: `Battery ${num(t.battery)}%` });
  }

  // --- Connectivity ------------------------------------------------------
  if (offline) {
    sensors.push({
      key: 'device',
      label: 'Device',
      value: 'offline',
      unit: '',
      level: 'offline',
      stateLabel: 'Offline',
      detail: `Device offline — last telemetry ${new Date(t.timestamp).toLocaleTimeString('en-GB')}`,
    });
    lines.push({
      tone: 'offline',
      text: `Device offline — last telemetry ${new Date(t.timestamp).toLocaleTimeString('en-GB', { hour12: false })}`,
    });
  } else {
    lines.push({ tone: 'ok', text: 'Device online' });
  }

  // --- Overall -----------------------------------------------------------
  const status = offline
    ? 'offline'
    : sensors.reduce<StatusLevel>((acc, s) => maxLevel(acc, s.level), 'safe');

  const headline =
    status === 'safe'
      ? 'MANHOLE SAFE'
      : status === 'warning'
        ? 'ATTENTION REQUIRED'
        : status === 'high'
          ? 'HIGH RISK DETECTED'
          : status === 'critical'
            ? 'CRITICAL — IMMEDIATE ACTION'
            : 'DEVICE OFFLINE';

  const firstIssue = lines.find((l) => l.tone !== 'ok');
  const subtitle =
    status === 'safe'
      ? 'All parameters are normal'
      : status === 'offline'
        ? 'No telemetry — showing last known values'
        : (firstIssue?.text ?? 'Attention required');

  // Safe state: only show the reassuring checklist, problems first otherwise.
  const ordered: RiskAssessment['lines'] =
    status === 'safe'
      ? lines
      : [...lines.filter((l) => l.tone !== 'ok'), ...lines.filter((l) => l.tone === 'ok')];

  return { status, headline, subtitle, lines: ordered, sensors };
}
