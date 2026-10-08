import { useState } from 'react';
import { useStore } from '../state/store';
import type { Severity } from '../model/types';

type Filter = 'all' | Severity;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High risk' },
  { key: 'warning', label: 'Warning' },
  { key: 'info', label: 'Info' },
];

export function AlertsPage() {
  const { alerts, unacknowledged, manholes, select, navigate } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [manholeFilter, setManholeFilter] = useState<string>('all');

  const shown = alerts.filter(
    (a) =>
      (filter === 'all' || a.severity === filter) &&
      (manholeFilter === 'all' || a.manholeId === manholeFilter),
  );

  // LatestAlerts renders the log; we filter by slicing through a wrapper panel.
  const filtered = (
    <section className="panel area-alerts alerts-full">
      <div className="panel-head">
        <h2 className="panel-title">Alert log</h2>
        <span className="panel-note">
          {shown.length} shown · {unacknowledged} unacknowledged
        </span>
      </div>
      <div className="panel-body" style={{ gap: 6 }}>
        {shown.length === 0 && <div className="empty">No alerts match this filter.</div>}
        <div className="alert-list">
          {shown.map((a) => {
            const m = manholes.find((x) => x.id === a.manholeId);
            return (
              <div
                key={a.id}
                className={`alert-row sev-${a.severity}${a.acknowledged ? ' acked' : ''}`}
              >
                <span
                  className={`alert-sev ${
                    a.severity === 'critical'
                      ? 'tone-critical'
                      : a.severity === 'high'
                        ? 'tone-high'
                        : a.severity === 'warning'
                          ? 'tone-warning'
                          : 'tone-info'
                  }`}
                >
                  {a.severity === 'high'
                    ? 'HIGH RISK'
                    : a.severity.toUpperCase()}
                </span>
                <span className="alert-mhid">{a.manholeId}</span>
                <span className="alert-msg" title={a.message}>
                  {a.message}
                </span>
                <span className="alert-time">
                  {new Date(a.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
                </span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    className="link-btn"
                    onClick={() => {
                      if (!m) return;
                      select(m.id);
                      navigate({ page: 'detail', id: m.id });
                    }}
                  >
                    Open
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-desc">
            Events raised when a sensor crosses a threshold or a device drops off the network.
          </p>
        </div>
        <div className="filter-row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-chip${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          <select
            className="select"
            value={manholeFilter}
            onChange={(e) => setManholeFilter(e.target.value)}
            aria-label="Filter by manhole"
          >
            <option value="all">All manholes</option>
            {manholes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} · {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Full-width log */}
      <div style={{ display: 'grid', gap: 14 }}>{filtered}</div>
    </div>
  );
}
