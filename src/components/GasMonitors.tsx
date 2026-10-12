import { useStore } from '../state/store';
import { assess, GAS_LABELS } from '../model/evaluate';
import type { GasKey } from '../model/types';
import { fmtSensor, toneClass } from '../lib/format';
import { IconGas } from './icons';

const GASES: GasKey[] = ['ch4', 'co', 'h2s'];

function GasCard({ gas }: { gas: GasKey }) {
  const { selected, selectedTelemetry: t, settings } = useStore();
  const a = assess(t, selected, settings.thresholds);
  const sensor = a.sensors.find((s) => s.key === gas)!;
  const band = settings.thresholds.gases[gas][t.gasUnit];
  const scaleMax = band.crit * 1.15;
  const known = typeof sensor.value === 'number';
  const pct = known ? Math.min(100, ((sensor.value as number) / scaleMax) * 100) : 0;
  const meta = GAS_LABELS[gas];
  const tone = toneClass(sensor.level);

  return (
    <div className={`gas-card level-${sensor.level}`}>
      <div className="gas-top">
        <div className="gas-id">
          <span className="gas-icon">
            <IconGas size={16} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="gas-sym">{meta.symbol}</div>
            <div className="gas-name">{meta.name}</div>
          </div>
        </div>
        <span className={`gas-state ${tone}`}>
          <span className="dot" />
          {sensor.stateLabel}
        </span>
      </div>

      <div className="gas-reading">
        <span className={`gas-value ${tone}`}>
          {known ? fmtSensor(sensor.value as number) : '—'}
        </span>
        <span className="gas-unit">
          {known ? (t.gasUnit === 'ppm' ? 'ppm' : 'raw') : ''}
        </span>
      </div>

      {t.gasUnit === 'raw' && <span className="raw-tag">RAW SENSOR LEVEL</span>}

      <div className={tone} title={`${meta.symbol} against configured thresholds`}>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${pct}%` }} />
          <span className="bar-tick" style={{ left: `${(band.warn / scaleMax) * 100}%` }} title={`Warning ${band.warn}`} />
          <span className="bar-tick" style={{ left: `${(band.high / scaleMax) * 100}%` }} title={`High risk ${band.high}`} />
          <span className="bar-tick" style={{ left: `${(band.crit / scaleMax) * 100}%` }} title={`Critical ${band.crit}`} />
        </div>
      </div>

      <div className="bar-scale">
        <span>0</span>
        <span>
          W {band.warn} · H {band.high} · C {band.crit}
        </span>
      </div>
    </div>
  );
}

export function GasMonitors() {
  const { selectedTelemetry } = useStore();
  return (
    <section className="panel area-gases">
      <div className="panel-head">
        <h2 className="panel-title">Gas monitors</h2>
        <span className="panel-note">
          {selectedTelemetry.gasUnit === 'ppm'
            ? 'Calibrated ppm from backend'
            : 'RAW ADC values — not calibrated ppm'}
        </span>
      </div>
      <div className="panel-body">
        <div className="gas-grid">
          {GASES.map((g) => (
            <GasCard key={g} gas={g} />
          ))}
        </div>
        <div className="bar-scale" style={{ padding: '0 2px' }}>
          <span>{selectedTelemetry.manholeId} gas channels · thresholds from Settings</span>
          <span>last {new Date(selectedTelemetry.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</span>
        </div>
      </div>
    </section>
  );
}
