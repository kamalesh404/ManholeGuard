import { useStore } from '../state/store';
import { DEFAULT_THRESHOLDS, GAS_LABELS } from '../model/evaluate';
import type { GasKey } from '../model/types';

const GASES: GasKey[] = ['ch4', 'co', 'h2s'];

export function Settings() {
  const { settings, updateSettings, provider, manholes } = useStore();
  const unit = settings.gasUnit;
  const th = settings.thresholds;

  const setGas = (g: GasKey, band: 'warn' | 'high' | 'crit', raw: string) => {
    const v = Number(raw);
    if (Number.isNaN(v)) return;
    updateSettings({
      thresholds: {
        ...th,
        gases: { ...th.gases, [g]: { ...th.gases[g], [unit]: { ...th.gases[g][unit], [band]: v } } },
      },
    });
  };

  const setWater = (band: 'waterWarnPct' | 'waterHighPct' | 'waterCritPct', raw: string) => {
    const v = Number(raw);
    if (Number.isNaN(v)) return;
    updateSettings({ thresholds: { ...th, [band]: v } });
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">
            Alarm thresholds and telemetry interpretation used across every page.
          </p>
        </div>
        <button
          className="back-link"
          onClick={() => updateSettings({ thresholds: DEFAULT_THRESHOLDS })}
        >
          Reset thresholds
        </button>
      </div>

      <div className="settings-grid">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Telemetry source</h2>
            <span className="panel-note">{provider.kind}</span>
          </div>
          <div className="panel-body">
            <div className="field">
              <div>
                <div className="field-label">Gas value units</div>
                <div className="field-hint">
                  Matches what the backend sends. Raw values are never shown as ppm.
                </div>
              </div>
              <div className="seg" role="group" aria-label="Gas value units">
                <button
                  className={unit === 'ppm' ? 'on' : ''}
                  onClick={() => updateSettings({ gasUnit: 'ppm' })}
                >
                  ppm
                </button>
                <button
                  className={unit === 'raw' ? 'on' : ''}
                  onClick={() => updateSettings({ gasUnit: 'raw' })}
                >
                  Raw ADC
                </button>
              </div>
            </div>

            <div className="field">
              <div>
                <div className="field-label">Poll interval</div>
                <div className="field-hint">How often telemetry frames are requested.</div>
              </div>
              <select
                className="select"
                value={settings.pollMs}
                onChange={(e) => updateSettings({ pollMs: Number(e.target.value) })}
              >
                <option value={1000}>1 second</option>
                <option value={2000}>2 seconds</option>
                <option value={5000}>5 seconds</option>
              </select>
            </div>

            <div className="info-block" style={{ paddingTop: 6 }}>
              Source: <code>{provider.label}</code> implementing <code>TelemetryProvider</code>.
              To go live, swap the provider for one that reads your gateway's{' '}
              <code>Telemetry</code> payload (<code>manholeId</code>, <code>timestamp</code>,{' '}
              <code>ch4</code>, <code>co</code>, <code>h2s</code>, <code>waterLevel</code>,{' '}
              <code>temperature</code>, <code>humidity</code>, <code>coverStatus</code>,{' '}
              <code>vibration</code>, <code>battery</code>, <code>wifiStatus</code>,{' '}
              <code>signalStrength</code>, <code>deviceStatus</code>) — no UI changes needed.
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Gas thresholds · {unit === 'ppm' ? 'ppm' : 'raw ADC'}</h2>
            <span className="panel-note">warning / high / critical</span>
          </div>
          <div className="panel-body">
            {GASES.map((g) => (
              <div className="field" key={g}>
                <div>
                  <div className="field-label">
                    {GAS_LABELS[g].symbol} · {GAS_LABELS[g].name}
                  </div>
                  <div className="field-hint">warn ≥ {th.gases[g][unit].warn}</div>
                </div>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    className="input"
                    type="number"
                    value={th.gases[g][unit].warn}
                    onChange={(e) => setGas(g, 'warn', e.target.value)}
                    aria-label={`${g} warning threshold`}
                  />
                  <input
                    className="input"
                    type="number"
                    value={th.gases[g][unit].high}
                    onChange={(e) => setGas(g, 'high', e.target.value)}
                    aria-label={`${g} high risk threshold`}
                  />
                  <input
                    className="input"
                    type="number"
                    value={th.gases[g][unit].crit}
                    onChange={(e) => setGas(g, 'crit', e.target.value)}
                    aria-label={`${g} critical threshold`}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Water &amp; power thresholds</h2>
            <span className="panel-note">% of depth</span>
          </div>
          <div className="panel-body">
            <div className="field">
              <div className="field-label">Water warning level</div>
              <input
                className="input"
                type="number"
                value={th.waterWarnPct}
                onChange={(e) => setWater('waterWarnPct', e.target.value)}
                aria-label="Water warning threshold"
              />
            </div>
            <div className="field">
              <div className="field-label">Water high-risk level</div>
              <input
                className="input"
                type="number"
                value={th.waterHighPct}
                onChange={(e) => setWater('waterHighPct', e.target.value)}
                aria-label="Water high risk threshold"
              />
            </div>
            <div className="field">
              <div className="field-label">Water critical level</div>
              <input
                className="input"
                type="number"
                value={th.waterCritPct}
                onChange={(e) => setWater('waterCritPct', e.target.value)}
                aria-label="Water critical threshold"
              />
            </div>
            <div className="field">
              <div className="field-label">Battery low threshold</div>
              <input
                className="input"
                type="number"
                value={th.batteryWarnPct}
                onChange={(e) =>
                  updateSettings({
                    thresholds: { ...th, batteryWarnPct: Number(e.target.value) || 0 },
                  })
                }
                aria-label="Battery warning threshold"
              />
            </div>
            <div className="field-hint">
              Thresholds apply to all {manholes.length} monitored manholes.
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">About this prototype</h2>
            <span className="panel-note">DEMO DATA</span>
          </div>
          <div className="panel-body info-block">
            <p style={{ margin: 0 }}>
              Every value on this dashboard is <strong>simulated</strong> for demonstration. No
              readings come from a physical ESP32-C3.
            </p>
            <p style={{ margin: '8px 0 0' }}>
              The simulation models {manholes.length} manholes across five states — safe, warning,
              high risk, critical and offline — and generates alerts whenever a sensor escalates.
              Use the <strong>DEMO DATA</strong> bar at the bottom of the screen to force the
              selected manhole into any state.
            </p>
            <p style={{ margin: '8px 0 0' }}>
              Modelled channels: <code>CH₄</code>, <code>CO</code>, <code>H₂S</code>, water level,
              temperature, humidity, cover, vibration, battery, Wi-Fi, RSSI and device status.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
