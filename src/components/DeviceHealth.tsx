import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { formatAgo, formatUptime, toneClass } from '../lib/format';
import { IconBattery, IconWifi } from './icons';

/** Small illustrated ESP32-C3 controller board. */
export function Esp32Board({ online, width = 92 }: { online: boolean; width?: number }) {
  const led = online ? '#34d399' : '#8a93a5';
  return (
    <svg width={width} height={width * 0.78} viewBox="0 0 100 78" aria-hidden>
      <defs>
        <linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12362c" />
          <stop offset="1" stopColor="#0c2620" />
        </linearGradient>
      </defs>
      <rect x="3" y="6" width="94" height="66" rx="6" fill="url(#pcb)" stroke="#1f5c4a" />
      {/* header pins */}
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} x={10 + i * 12} y="66" width="7" height="6" rx="1.4" fill="#c9a227" opacity="0.85" />
      ))}
      {/* MCU can */}
      <rect x="34" y="24" width="30" height="26" rx="3" fill="#15181d" stroke="#2a2f38" />
      <rect x="38" y="28" width="22" height="18" rx="2" fill="#1d2129" />
      {/* RF can */}
      <rect x="68" y="14" width="24" height="18" rx="2.5" fill="#20242c" stroke="#333a45" />
      {/* PCB antenna trace */}
      <path
        d="M72 16h16M72 20h16M72 24h12M72 28h16"
        stroke="#d8b64a"
        strokeWidth="1.4"
        opacity="0.75"
        strokeLinecap="round"
      />
      {/* crystal + passives */}
      <rect x="14" y="30" width="12" height="7" rx="1.5" fill="#2b3039" />
      <rect x="14" y="44" width="8" height="6" rx="1.4" fill="#2b3039" />
      <rect x="26" y="44" width="6" height="6" rx="1.4" fill="#2b3039" />
      {/* status LED */}
      <circle cx="88" cy="58" r="4" fill={led} opacity={online ? 1 : 0.55} />
      <circle cx="88" cy="58" r="7" fill={led} opacity={online ? 0.28 : 0.12} />
      {/* silkscreen */}
      <text x="10" y="18" fill="#5fd8b0" fontSize="8.5" fontFamily="monospace" letterSpacing="0.6">
        ESP32-C3
      </text>
      <text x="10" y="60" fill="#3f9d7f" fontSize="6.5" fontFamily="monospace">
        MG-IoT
      </text>
    </svg>
  );
}

export function DeviceHealth() {
  const { selected, selectedTelemetry: t, bootTimes, now, status } = useStore();
  const online = t.deviceStatus === 'online';
  const uptime = online ? now - (bootTimes[selected.id] ?? now) : 0;
  const battLevel = t.battery <= 30 ? 'tone-warning' : 'tone-safe';

  const rows: [string, ReactNode][] = [
    ['Device ID', selected.device.id],
    ['Controller', selected.device.model],
    [
      'Wi-Fi',
      <span className={t.wifiStatus === 'connected' ? 'tone-safe' : 'tone-critical'}>
        {t.wifiStatus === 'connected' ? 'Connected' : 'Disconnected'}
      </span>,
    ],
    ['Signal', t.signalStrength !== null ? `${t.signalStrength} dBm` : '—'],
    ['Uptime', online ? formatUptime(uptime) : '—'],
    ['Firmware', selected.device.firmware],
    ['Last heartbeat', formatAgo(t.timestamp, now)],
  ];

  return (
    <section className="panel area-device">
      <div className="panel-head">
        <h2 className="panel-title">Device health</h2>
        <span className="panel-note">{selected.device.heartbeatMs / 1000}s heartbeat</span>
      </div>
      <div className="panel-body">
        <div className={`dev-status ${online ? 'tone-safe' : 'tone-offline'}`}>
          <span className="dot" style={online ? undefined : { animation: 'none' }} />
          {online ? 'ONLINE' : 'OFFLINE'}
          <span
            className="chip"
            style={{ marginLeft: 'auto', color: 'var(--text-faint)', borderColor: 'var(--line-strong)' }}
          >
            {status === 'offline' ? 'no telemetry' : 'reporting'}
          </span>
        </div>

        <div className="dev-body">
          <div className="dev-rows">
            <div className="dev-row" style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span className="dev-key">Battery</span>
                <span className={`dev-val ${battLevel}`}>{t.battery}%</span>
              </div>
              <div className={`batt-bar ${battLevel}`}>
                <div className="batt-fill" style={{ width: `${t.battery}%` }} />
              </div>
            </div>
            {rows.map(([k, v]) => (
              <div className="dev-row" key={k}>
                <span className="dev-key">{k}</span>
                <span className="dev-val">{v}</span>
              </div>
            ))}
          </div>
          <div className="esp-visual">
            <Esp32Board online={online} width={92} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10.5,
                color: 'var(--text-faint)',
                marginTop: 6,
              }}
            >
              {t.wifiStatus === 'connected' ? <IconWifi size={13} /> : <IconBattery size={13} />}
              {t.wifiStatus === 'connected' ? 'Wi-Fi uplink' : 'No uplink'}
            </div>
          </div>
        </div>

        <div className={`chip ${toneClass(status)}`} style={{ alignSelf: 'flex-start' }}>
          {selected.device.model} · {selected.name}
        </div>
      </div>
    </section>
  );
}
