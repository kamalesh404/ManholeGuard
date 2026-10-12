import { useStore } from '../state/store';
import { waterPct } from '../model/evaluate';
import { fmtSensor, formatAgo, formatClock, STATUS_LABEL, toneClass } from '../lib/format';
import { StatusHero } from '../components/StatusHero';
import { GasMonitors } from '../components/GasMonitors';
import { WaterCard } from '../components/WaterCard';
import { CurrentRisk } from '../components/CurrentRisk';
import { DeviceHealth } from '../components/DeviceHealth';
import { LatestAlerts } from '../components/AlertsPanel';
import { ManholeCutaway } from '../components/ManholeCutaway';
import { Sparkline } from '../components/Sparkline';
import { IconArrowLeft } from '../components/icons';

export function ManholeDetail() {
  const {
    selected: m,
    selectedTelemetry: t,
    settings,
    history,
    now,
    navigate,
    assessment,
  } = useStore();

  const a = assessment;
  const hist = history[m.id] ?? [];
  const trend = (pick: (x: typeof t) => number) => hist.map(pick);
  const waterCm = t.waterLevel;
  const pct = waterCm === null ? null : waterPct(t, m);

  const rows: {
    name: string;
    value: string;
    level: string;
    tone: string;
    series?: number[];
    color?: string;
  }[] = [
    {
      name: 'CH₄ (methane)',
      value: t.ch4 === null ? '—' : `${fmtSensor(t.ch4)} ${t.gasUnit === 'ppm' ? 'ppm' : 'raw'}`,
      level: a.sensors.find((s) => s.key === 'ch4')!.stateLabel,
      tone: toneClass(a.sensors.find((s) => s.key === 'ch4')!.level),
      series: t.hasData ? trend((x) => x.ch4 ?? 0) : undefined,
      color: 'var(--safe)',
    },
    {
      name: 'CO (carbon monoxide)',
      value: t.co === null ? '—' : `${fmtSensor(t.co)} ${t.gasUnit === 'ppm' ? 'ppm' : 'raw'}`,
      level: a.sensors.find((s) => s.key === 'co')!.stateLabel,
      tone: toneClass(a.sensors.find((s) => s.key === 'co')!.level),
      series: t.hasData ? trend((x) => x.co ?? 0) : undefined,
      color: 'var(--info)',
    },
    {
      name: 'H₂S (hydrogen sulfide)',
      value: t.h2s === null ? '—' : `${fmtSensor(t.h2s)} ${t.gasUnit === 'ppm' ? 'ppm' : 'raw'}`,
      level: a.sensors.find((s) => s.key === 'h2s')!.stateLabel,
      tone: toneClass(a.sensors.find((s) => s.key === 'h2s')!.level),
      series: t.hasData ? trend((x) => x.h2s ?? 0) : undefined,
      color: 'var(--high)',
    },
    {
      name: 'Water level',
      value: waterCm === null || pct === null ? '—' : `${waterCm} cm · ${pct}%`,
      level: a.sensors.find((s) => s.key === 'water')!.stateLabel,
      tone: toneClass(a.sensors.find((s) => s.key === 'water')!.level),
      series: t.hasData && waterCm !== null ? trend((x) => x.waterLevel ?? 0) : undefined,
      color: 'var(--info)',
    },
    {
      name: 'Cover status',
      value: t.coverStatus === null ? '—' : t.coverStatus.toUpperCase(),
      level: t.coverStatus === null ? 'No data' : t.coverStatus === 'open' ? 'Warning' : 'Secure',
      tone:
        t.coverStatus === null
          ? 'tone-offline'
          : t.coverStatus === 'open'
            ? 'tone-warning'
            : 'tone-safe',
    },
    {
      name: 'Vibration / tamper',
      value: t.vibration === null ? '—' : t.vibration.toUpperCase(),
      level: t.vibration === null ? 'No data' : t.vibration === 'detected' ? 'Warning' : 'Normal',
      tone:
        t.vibration === null
          ? 'tone-offline'
          : t.vibration === 'detected'
            ? 'tone-warning'
            : 'tone-safe',
    },
    {
      name: 'Battery',
      value: !t.hasData ? '—' : t.battery === null ? 'USB powered' : `${t.battery} %`,
      level: !t.hasData
        ? 'No data'
        : t.battery === null
          ? 'USB'
          : t.battery <= settings.thresholds.batteryWarnPct
            ? 'Low'
            : 'Normal',
      tone: !t.hasData
        ? 'tone-offline'
        : t.battery !== null && t.battery <= settings.thresholds.batteryWarnPct
          ? 'tone-warning'
          : 'tone-safe',
      series: t.hasData && t.battery !== null ? trend((x) => x.battery ?? 0) : undefined,
      color: 'var(--safe)',
    },
    {
      name: 'Link',
      value: t.linkStatus.toUpperCase(),
      level: t.linkStatus === 'connected' ? 'OK' : 'Down',
      tone: t.linkStatus === 'connected' ? 'tone-safe' : 'tone-critical',
    },
    {
      name: 'Transport',
      value: t.linkDetail ?? '—',
      level: t.linkStatus === 'connected' ? 'Serial' : 'Down',
      tone: t.linkStatus === 'connected' ? 'tone-safe' : 'tone-offline',
    },
    {
      name: 'Device status',
      value: t.deviceStatus.toUpperCase(),
      level: t.deviceStatus === 'online' ? 'Reporting' : 'Offline',
      tone: t.deviceStatus === 'online' ? 'tone-safe' : 'tone-offline',
    },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <button className="back-link" onClick={() => navigate({ page: 'manholes' })}>
            <IconArrowLeft size={13} /> All manholes
          </button>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            {m.id} · {m.name}
          </h1>
          <p className="page-desc">
            Depth {m.depthCm} cm · {m.device.model} ({m.device.id}) · firmware {m.device.firmware} ·{' '}
            {t.hasData
              ? `last frame ${formatClock(t.timestamp)} (${formatAgo(t.timestamp, now)})`
              : 'no telemetry received yet'}
          </p>
        </div>
        <span className={`chip ${toneClass(a.status)}`}>
          <span className="dot" /> {STATUS_LABEL[a.status]}
        </span>
      </div>

      <div className="detail-grid">
        <StatusHero />
        <CurrentRisk />
        <GasMonitors />
        <WaterCard />
        <DeviceHealth />

        <section className="panel area-telemetry">
          <div className="panel-head">
            <h2 className="panel-title">Telemetry</h2>
            <span className="panel-note">
              {t.gasUnit === 'ppm' ? 'calibrated ppm' : 'RAW ADC'} ·{' '}
              {hist.length ? `last ${hist.length} frames` : 'no frames yet'}
            </span>
          </div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            <table className="tele-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th className="num">Value</th>
                  <th>State</th>
                  <th style={{ width: '30%' }}>Recent trend</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="num">{r.value}</td>
                    <td className={r.tone} style={{ fontSize: 11.5, letterSpacing: '0.06em' }}>
                      {r.level}
                    </td>
                    <td>
                      {r.series ? (
                        <Sparkline values={r.series} color={r.color ?? 'var(--info)'} />
                      ) : (
                        <span className="muted" style={{ fontSize: 11 }}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <LatestAlerts />
        <ManholeCutaway />
      </div>
    </div>
  );
}
