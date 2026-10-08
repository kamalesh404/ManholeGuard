import { useStore } from '../state/store';
import { waterPct } from '../model/evaluate';
import { formatAgo, formatClock, STATUS_LABEL, toneClass } from '../lib/format';
import { StatusHero } from '../components/StatusHero';
import { GasMonitors } from '../components/GasMonitors';
import { WaterCard } from '../components/WaterCard';
import { CurrentRisk } from '../components/CurrentRisk';
import { DeviceHealth } from '../components/DeviceHealth';
import { EnvironmentCard } from '../components/EnvironmentCard';
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
  const pct = waterPct(t, m);

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
      value: `${Math.round(t.ch4)} ${t.gasUnit === 'ppm' ? 'ppm' : 'raw'}`,
      level: a.sensors.find((s) => s.key === 'ch4')!.stateLabel,
      tone: toneClass(a.sensors.find((s) => s.key === 'ch4')!.level),
      series: trend((x) => x.ch4),
      color: 'var(--safe)',
    },
    {
      name: 'CO (carbon monoxide)',
      value: `${Math.round(t.co)} ${t.gasUnit === 'ppm' ? 'ppm' : 'raw'}`,
      level: a.sensors.find((s) => s.key === 'co')!.stateLabel,
      tone: toneClass(a.sensors.find((s) => s.key === 'co')!.level),
      series: trend((x) => x.co),
      color: 'var(--info)',
    },
    {
      name: 'H₂S (hydrogen sulfide)',
      value: `${Math.round(t.h2s)} ${t.gasUnit === 'ppm' ? 'ppm' : 'raw'}`,
      level: a.sensors.find((s) => s.key === 'h2s')!.stateLabel,
      tone: toneClass(a.sensors.find((s) => s.key === 'h2s')!.level),
      series: trend((x) => x.h2s),
      color: 'var(--high)',
    },
    {
      name: 'Water level',
      value: `${t.waterLevel} cm · ${pct}%`,
      level: a.sensors.find((s) => s.key === 'water')!.stateLabel,
      tone: toneClass(a.sensors.find((s) => s.key === 'water')!.level),
      series: trend((x) => x.waterLevel),
      color: 'var(--info)',
    },
    {
      name: 'Temperature',
      value: `${t.temperature.toFixed(1)} °C`,
      level: 'Normal',
      tone: 'tone-safe',
      series: trend((x) => x.temperature),
      color: 'var(--warning)',
    },
    {
      name: 'Humidity',
      value: `${Math.round(t.humidity)} %`,
      level: 'Normal',
      tone: 'tone-safe',
      series: trend((x) => x.humidity),
      color: 'var(--info)',
    },
    {
      name: 'Cover status',
      value: t.coverStatus.toUpperCase(),
      level: t.coverStatus === 'open' ? 'Warning' : 'Secure',
      tone: t.coverStatus === 'open' ? 'tone-warning' : 'tone-safe',
    },
    {
      name: 'Vibration / tamper',
      value: t.vibration.toUpperCase(),
      level: t.vibration === 'detected' ? 'Warning' : 'Normal',
      tone: t.vibration === 'detected' ? 'tone-warning' : 'tone-safe',
    },
    {
      name: 'Battery',
      value: `${t.battery} %`,
      level: t.battery <= settings.thresholds.batteryWarnPct ? 'Low' : 'Normal',
      tone: t.battery <= settings.thresholds.batteryWarnPct ? 'tone-warning' : 'tone-safe',
      series: trend((x) => x.battery),
      color: 'var(--safe)',
    },
    {
      name: 'Wi-Fi',
      value: t.wifiStatus.toUpperCase(),
      level: t.wifiStatus === 'connected' ? 'OK' : 'Down',
      tone: t.wifiStatus === 'connected' ? 'tone-safe' : 'tone-critical',
    },
    {
      name: 'Signal strength',
      value: t.signalStrength !== null ? `${t.signalStrength} dBm` : '—',
      level: 'RSSI',
      tone: 'tone-offline',
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
            Depth {m.depthCm} cm · {m.device.model} ({m.device.id}) · firmware {m.device.firmware} ·
            last frame {formatClock(t.timestamp)} ({formatAgo(t.timestamp, now)})
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
        <EnvironmentCard />

        <section className="panel area-telemetry">
          <div className="panel-head">
            <h2 className="panel-title">Telemetry</h2>
            <span className="panel-note">
              {settings.gasUnit === 'ppm' ? 'calibrated ppm' : 'RAW ADC'} · last {hist.length} frames
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
