import { useStore } from '../state/store';
import { IconHumidity, IconThermo } from './icons';

export function EnvironmentCard() {
  const { selectedTelemetry: t } = useStore();

  return (
    <section className="panel area-env">
      <div className="panel-head">
        <h2 className="panel-title">Environment</h2>
        <span className="panel-note">DHT sensor</span>
      </div>
      <div className="panel-body">
        <div className="env-grid">
          <div className="stat-card">
            <div className="stat-label">
              <IconThermo size={13} /> Temperature
            </div>
            <div className="stat-value">
              {t.temperature.toFixed(1)}
              <small>°C</small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              <IconHumidity size={13} /> Humidity
            </div>
            <div className="stat-value">
              {Math.round(t.humidity)}
              <small>%</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
