import { useStore } from '../state/store';
import type { Scenario } from '../model/types';

const OPTIONS: { scenario: Scenario; label: string }[] = [
  { scenario: 'safe', label: 'Safe' },
  { scenario: 'warning', label: 'Warning' },
  { scenario: 'high', label: 'High risk' },
  { scenario: 'critical', label: 'Critical' },
  { scenario: 'offline', label: 'Offline' },
];

/**
 * Persistent simulation controls.
 * Forces the selected manhole into a safety scenario so every dependent
 * surface (background, status, risk reasons, alerts, fleet) can be tested.
 */
export function DemoBar() {
  const { selected, scenarios, setScenario, provider } = useStore();
  const current = scenarios[selected.id] ?? 'safe';

  return (
    <div className="demo-bar" role="group" aria-label="Demo simulation controls">
      <span className="demo-label">DEMO DATA</span>
      <span className="demo-target">
        {selected.id} · force state
      </span>
      <div className="demo-btns">
        {OPTIONS.map((o) => (
          <button
            key={o.scenario}
            className={`demo-btn${current === o.scenario ? ' active' : ''}`}
            data-level={o.scenario}
            aria-pressed={current === o.scenario}
            onClick={() => setScenario(selected.id, o.scenario)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span className="demo-note">
        Simulated telemetry ({provider.label}) — not a live ESP32 feed · applies to {selected.id}
      </span>
    </div>
  );
}
