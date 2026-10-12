import { useStore } from '../state/store';
import { assess } from '../model/evaluate';
import { STATUS_LABEL, toneClass } from '../lib/format';
import { IconChevronRight } from './icons';

/** Compact fleet monitor — click a row to select, arrow to open detail. */
export function FleetPanel() {
  const { manholes, telemetry, settings, selectedId, select, navigate } = useStore();

  return (
    <section className="panel area-fleet">
      <div className="panel-head">
        <h2 className="panel-title">Other manholes</h2>
        <span className="panel-note">{manholes.length} monitored</span>
      </div>
      <div className="panel-body" style={{ gap: 2 }}>
        <div className="fleet-list">
          {manholes.map((m) => {
            const t = telemetry[m.id];
            const a = assess(t, m, settings.thresholds);
            const tone = toneClass(a.status);
            return (
              <div
                key={m.id}
                className={`fleet-row${m.id === selectedId ? ' selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Select ${m.id} ${m.name}, status ${STATUS_LABEL[a.status]}`}
                onClick={() => select(m.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select(m.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <span
                  className={`dot ${tone}`}
                  style={a.status === 'offline' ? { animation: 'none' } : undefined}
                  title={STATUS_LABEL[a.status]}
                />
                <span className="fleet-id">{m.id}</span>
                <span className="fleet-name">{m.name}</span>
                <span
                  className={`fleet-batt ${t.battery !== null && t.battery <= 30 ? 'tone-warning' : ''}`}
                >
                  {!t.hasData ? '—' : t.battery === null ? 'USB' : `${t.battery}%`}
                </span>
                <button
                  className="fleet-go"
                  title={`Open ${m.id} detail`}
                  aria-label={`Open detail for ${m.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    select(m.id);
                    navigate({ page: 'detail', id: m.id });
                  }}
                >
                  <IconChevronRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
