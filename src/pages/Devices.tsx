import { useStore } from '../state/store';
import { assess } from '../model/evaluate';
import { formatAgo, formatUptime, STATUS_LABEL, toneClass } from '../lib/format';
import { Esp32Board } from '../components/DeviceHealth';
import { IconChevronRight } from '../components/icons';

export function Devices() {
  const { manholes, telemetry, settings, bootTimes, now, navigate, select } = useStore();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-desc">
            IoT controllers reporting to the gateway. Health is derived from the latest heartbeat.
          </p>
        </div>
        <span className="chip">{manholes.length} controllers</span>
      </div>

      <div className="mh-grid">
        {manholes.map((m) => {
          const t = telemetry[m.id];
          const online = t.deviceStatus === 'online';
          const a = assess(t, m, settings.thresholds);
          const uptime = online ? now - (bootTimes[m.id] ?? now) : 0;

          const rows: [string, string][] = [
            ['Device ID', m.device.id],
            ['Manhole', `${m.id} · ${m.name}`],
            ['Controller', m.device.model],
            ['Firmware', m.device.firmware],
            ['Wi-Fi', t.wifiStatus === 'connected' ? 'Connected' : 'Disconnected'],
            ['Signal', t.signalStrength !== null ? `${t.signalStrength} dBm` : '—'],
            ['Battery', `${t.battery}%`],
            ['Uptime', online ? formatUptime(uptime) : '—'],
            ['Last heartbeat', formatAgo(t.timestamp, now)],
          ];

          return (
            <div key={m.id} className="panel">
              <div className="panel-head">
                <h2 className="panel-title">{m.device.model}</h2>
                <span className={`chip ${online ? 'tone-safe' : 'tone-offline'}`}>
                  <span
                    className="dot"
                    style={online ? undefined : { animation: 'none' }}
                  />
                  {online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="panel-body">
                <div className="dev-body">
                  <div className="dev-rows">
                    {rows.map(([k, v]) => (
                      <div className="dev-row" key={k}>
                        <span className="dev-key">{k}</span>
                        <span className="dev-val">{v}</span>
                      </div>
                    ))}
                    <div className="dev-row" style={{ display: 'block' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <span className="dev-key">Battery level</span>
                        <span className={`dev-val ${t.battery <= 30 ? 'tone-warning' : 'tone-safe'}`}>
                          {t.battery}%
                        </span>
                      </div>
                      <div className={`batt-bar ${t.battery <= 30 ? 'tone-warning' : 'tone-safe'}`}>
                        <div className="batt-fill" style={{ width: `${t.battery}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="esp-visual">
                    <Esp32Board online={online} width={92} />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    paddingTop: 4,
                  }}
                >
                  <span className={`chip ${toneClass(a.status)}`}>{STATUS_LABEL[a.status]}</span>
                  <button
                    className="link-btn"
                    onClick={() => {
                      select(m.id);
                      navigate({ page: 'detail', id: m.id });
                    }}
                  >
                    Open manhole <IconChevronRight size={12} style={{ verticalAlign: -2 }} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
