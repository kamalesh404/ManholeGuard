import { useStore, type Route } from '../state/store';
import { formatAgo } from '../lib/format';
import { IconShieldMark } from './icons';

const TABS: { label: string; route: Route; match: string }[] = [
  { label: 'Live Monitor', route: { page: 'live' }, match: 'live' },
  { label: 'Manholes', route: { page: 'manholes' }, match: 'manholes' },
  { label: 'Alerts', route: { page: 'alerts' }, match: 'alerts' },
  { label: 'Devices', route: { page: 'devices' }, match: 'devices' },
  { label: 'Settings', route: { page: 'settings' }, match: 'settings' },
];

export function Header() {
  const { selected, selectedTelemetry, status, route, navigate, now, unacknowledged } = useStore();
  const online = selectedTelemetry.deviceStatus === 'online';
  const activeKey = route.page === 'detail' ? 'manholes' : route.page;

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">
          <IconShieldMark size={19} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="brand-title">MANHOLEGUARD</div>
          <div className="brand-sub">Smart IoT-Based Manhole Safety Monitoring System</div>
        </div>
      </div>

      <nav className="nav" aria-label="Main navigation">
        {TABS.map((t) => (
          <button
            key={t.label}
            className={`nav-tab${activeKey === t.match ? ' active' : ''}`}
            onClick={() => navigate(t.route)}
            aria-current={activeKey === t.match ? 'page' : undefined}
          >
            {t.label}
            {t.match === 'alerts' && unacknowledged > 0 && (
              <span className="nav-badge">{unacknowledged}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="header-meta">
        <div className="header-mh">
          <div className="header-mh-id">
            {selected.id} <span className="muted">·</span> {selected.name}
          </div>
          <div className="header-updated">
            Last update: {selectedTelemetry.hasData ? formatAgo(selectedTelemetry.timestamp, now) : 'never'}
          </div>
        </div>
        <span
          className="live-pill"
          data-status={status}
          title={online ? 'Receiving telemetry' : 'No telemetry from this device'}
        >
          <span className="live-dot" style={online ? undefined : { animation: 'none', opacity: 0.6 }} />
          {online ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
    </header>
  );
}
