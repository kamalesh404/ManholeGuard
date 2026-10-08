import { useStore } from '../state/store';
import { assess } from '../model/evaluate';
import type { StatusLevel } from '../model/types';

const CELLS: { level: StatusLevel; label: string }[] = [
  { level: 'safe', label: 'Safe' },
  { level: 'warning', label: 'Warning' },
  { level: 'critical', label: 'Critical' },
  { level: 'offline', label: 'Offline' },
];

/** Large, simple fleet counters. High-risk counts fold into Critical. */
export function SystemOverview() {
  const { manholes, telemetry, settings } = useStore();

  const counts = manholes.reduce<Record<string, number>>((acc, m) => {
    const s = assess(telemetry[m.id], m, settings.thresholds).status;
    const key = s === 'high' ? 'critical' : s;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="panel area-overview">
      <div className="panel-head">
        <h2 className="panel-title">System overview</h2>
        <span className="panel-note">fleet</span>
      </div>
      <div className="panel-body">
        <div className="ov-grid">
          {CELLS.map((c) => (
            <div className="ov-cell" key={c.level}>
              <div className={`ov-num tone-${c.level}`}>{counts[c.level] ?? 0}</div>
              <div className={`ov-label tone-${c.level}`}>
                <span
                  className="dot"
                  style={{ width: 6, height: 6 }}
                  data-offline={c.level === 'offline'}
                />
                {c.label}
              </div>
            </div>
          ))}
        </div>
        <div className="field-hint" style={{ paddingTop: 2 }}>
          {manholes.length} manholes monitored · updates every poll
        </div>
      </div>
    </section>
  );
}
