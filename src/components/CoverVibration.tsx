import { useStore } from '../state/store';
import { IconCover, IconVibration } from './icons';

export function CoverVibration() {
  const { selectedTelemetry: t } = useStore();
  const coverKnown = t.coverStatus !== null;
  const coverOpen = t.coverStatus === 'open';
  const vibKnown = t.vibration !== null;
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
            <div
              className={`state-main ${!coverKnown ? 'tone-offline' : coverOpen ? 'tone-warning' : 'tone-safe'}`}
            >
              <span className="dot" style={!coverKnown ? { animation: 'none' } : undefined} />
              {!coverKnown ? 'NO DATA' : coverOpen ? 'OPEN' : 'CLOSED'}
            </div>
            <div className="state-sub">
              {!coverKnown ? 'Not reported by this device' : coverOpen ? 'Warning' : 'Secure'}
            </div>
          </div>

          <div className={`state-card${vibDetected ? ' alerting' : ''}`}>
            <div className="state-head">
              <span>Vibration / tamper</span>
              <span className="state-icon">
                <IconVibration size={16} />
              </span>
            </div>
            <div
              className={`state-main ${!vibKnown ? 'tone-offline' : vibDetected ? 'tone-warning' : 'tone-safe'}`}
            >
              <span className="dot" style={!vibKnown ? { animation: 'none' } : undefined} />
              {!vibKnown ? 'NO DATA' : vibDetected ? 'ACTIVITY DETECTED' : 'NORMAL'}
            </div>
            <div className="state-sub">
              {!vibKnown ? 'Not reported by this device' : vibDetected ? 'Warning' : 'No unusual activity'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
