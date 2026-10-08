import { useStore } from '../state/store';
import { IconCover, IconVibration } from './icons';

export function CoverVibration() {
  const { selectedTelemetry: t } = useStore();
  const coverOpen = t.coverStatus === 'open';
  const vibDetected = t.vibration === 'detected';

  return (
    <section className="panel area-covervib">
      <div className="panel-head">
        <h2 className="panel-title">Access &amp; tamper</h2>
        <span className="panel-note">reed switch · accelerometer</span>
      </div>
      <div className="panel-body">
        <div className="cv-grid">
          <div className={`state-card${coverOpen ? ' alerting' : ''}`}>
            <div className="state-head">
              <span>Manhole cover</span>
              <span className="state-icon">
                <IconCover size={16} />
              </span>
            </div>
            <div className={`state-main ${coverOpen ? 'tone-warning' : 'tone-safe'}`}>
              <span className="dot" />
              {coverOpen ? 'OPEN' : 'CLOSED'}
            </div>
            <div className="state-sub">{coverOpen ? 'Warning' : 'Secure'}</div>
          </div>

          <div className={`state-card${vibDetected ? ' alerting' : ''}`}>
            <div className="state-head">
              <span>Vibration / tamper</span>
              <span className="state-icon">
                <IconVibration size={16} />
              </span>
            </div>
            <div className={`state-main ${vibDetected ? 'tone-warning' : 'tone-safe'}`}>
              <span className="dot" />
              {vibDetected ? 'ACTIVITY DETECTED' : 'NORMAL'}
            </div>
            <div className="state-sub">
              {vibDetected ? 'Warning' : 'No unusual activity'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
