import { useStore } from '../state/store';
import { formatClock, SEVERITY_CLASS, SEVERITY_LABEL } from '../lib/format';

export function LatestAlerts({ full = false }: { full?: boolean }) {
  const { alerts, navigate, acknowledge, acknowledgeAll } = useStore();
  const shown = full ? alerts : alerts.slice(0, 6);

  return (
    <section className={`panel area-alerts${full ? ' alerts-full' : ''}`}>
      <div className="panel-head">
        <h2 className="panel-title">{full ? 'Alert log' : 'Latest alerts'}</h2>
        {full ? (
          <button className="link-btn" onClick={acknowledgeAll}>
            Acknowledge all
          </button>
        ) : (
          <button className="link-btn" onClick={() => navigate({ page: 'alerts' })}>
            View all →
          </button>
        )}
      </div>
      <div className="panel-body" style={{ gap: 6 }}>
        {shown.length === 0 && <div className="empty">No alerts recorded.</div>}
        <div className="alert-list">
          {shown.map((a) => (
            <div
              key={a.id}
              className={`alert-row sev-${a.severity}${a.acknowledged ? ' acked' : ''}`}
              title={a.message}
            >
              <span className={`alert-sev ${SEVERITY_CLASS[a.severity]}`}>
                {SEVERITY_LABEL[a.severity]}
              </span>
              <span className="alert-mhid">{a.manholeId}</span>
              <span className="alert-msg">{a.message}</span>
              <span className="alert-time">{formatClock(a.timestamp)}</span>
              {full && (
                <button className="link-btn" onClick={() => acknowledge(a.id)} disabled={a.acknowledged}>
                  {a.acknowledged ? 'Acked' : 'Acknowledge'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
