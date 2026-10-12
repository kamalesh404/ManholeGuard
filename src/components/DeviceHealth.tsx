import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { formatAgo, formatUptime, toneClass } from '../lib/format';
import { IconBattery, IconSerial } from './icons';

/** Small illustrated Arduino Uno controller board. */
export function ArduinoBoard({ online, width = 92 }: { online: boolean; width?: number }) {
  const led = online ? '#34d399' : '#8a93a5';
  return (
    <svg width={width} height={width * 0.78} viewBox="0 0 100 78" aria-hidden>
      <defs>
        <linearGradient id="pcb-uno" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d6d7d" />
          <stop offset="1" stopColor="#0a5460" />
        </linearGradient>
      </defs>
      {/* board */}
      <rect x="3" y="6" width="94" height="66" rx="5" fill="url(#pcb-uno)" stroke="#128a9c" />
      {/* USB-B connector */}
      <rect x="1" y="14" width="17" height="15" rx="2" fill="#b9c0cb" stroke="#8a93a5" />
      <rect x="4" y="17" width="11" height="9" rx="1.2" fill="#7d8695" />
      {/* barrel power jack */}
      <rect x="82" y="12" width="16" height="17" rx="2.5" fill="#15181d" stroke="#2a2f38" />
      <circle cx="90" cy="20.5" r="4" fill="#0b0d11" />
      {/* ATmega328P (DIP-28) */}
      <rect x="36" y="24" width="34" height="30" rx="2.5" fill="#15181d" stroke="#2a2f38" />
      <rect x="40" y="27" width="26" height="24" rx="1.6" fill="#1d2129" />
      <path d="M50 24a4 4 0 0 0 6 0" stroke="#3a4250" fill="none" />
      {/* crystal */}
      <rect x="16" y="34" width="13" height="6" rx="3" fill="#c9ccd3" stroke="#8a93a5" />
      {/* reset button */}
      <rect x="16" y="16" width="9" height="9" rx="1.6" fill="#2b3039" stroke="#3a4250" />
      {/* headers — digital top, power/analog bottom */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={`t${i}`} x={34 + i * 7.6} y="8" width="6" height="6" rx="1.2" fill="#15181d" />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={`b${i}`} x={12 + i * 7.6} y="64" width="6" height="6" rx="1.2" fill="#15181d" />
      ))}
      {/* status LED */}
      <circle cx="77" cy="58" r="3.6" fill={led} opacity={online ? 1 : 0.55} />
      <circle cx="77" cy="58" r="6.6" fill={led} opacity={online ? 0.28 : 0.12} />
      {/* silkscreen */}
      <text x="10" y="60" fill="#d7f3f8" fontSize="8.5" fontFamily="monospace" letterSpacing="0.6">
        UNO
      </text>
      <text x="34" y="60" fill="#8fd6e2" fontSize="6.5" fontFamily="monospace">
        MG-IoT
      </text>
    </svg>
  );
}

export function DeviceHealth() {
  const { selected, selectedTelemetry: t, bootTimes, now, status } = useStore();
  const online = t.deviceStatus === 'online';
  const uptime = online ? now - (bootTimes[selected.id] ?? now) : 0;
  const batt = t.battery;
  const battLevel = batt !== null && batt <= 30 ? 'tone-warning' : 'tone-safe';
  const linked = t.linkStatus === 'connected';

  const rows: [string, ReactNode][] = [
    ['Device ID', selected.device.id],
    ['Controller', selected.device.model],
    [
      'Link',
      <span className={linked ? 'tone-safe' : 'tone-critical'}>
        {linked ? 'Connected' : 'Disconnected'}
      </span>,
    ],
    ['Transport', t.linkDetail ?? '—'],
    ['Uptime', online ? formatUptime(uptime) : '—'],
    ['Firmware', selected.device.firmware],
    ['Last heartbeat', t.hasData ? formatAgo(t.timestamp, now) : '—'],
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
            {!t.hasData ? (
              <div className="dev-row">
                <span className="dev-key">Power</span>
                <span className="dev-val muted">—</span>
              </div>
            ) : batt === null ? (
              <div className="dev-row">
                <span className="dev-key">Power</span>
                <span className="dev-val tone-safe">USB powered</span>
              </div>
            ) : (
              <div className="dev-row" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span className="dev-key">Battery</span>
                  <span className={`dev-val ${battLevel}`}>{batt}%</span>
                </div>
                <div className={`batt-bar ${battLevel}`}>
                  <div className="batt-fill" style={{ width: `${batt}%` }} />
                </div>
              </div>
            )}
            {rows.map(([k, v]) => (
              <div className="dev-row" key={k}>
                <span className="dev-key">{k}</span>
                <span className="dev-val">{v}</span>
              </div>
            ))}
          </div>
          <div className="esp-visual">
            <ArduinoBoard online={online} width={92} />
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
              {linked ? <IconSerial size={13} /> : <IconBattery size={13} />}
              {linked ? 'USB serial uplink' : 'No uplink'}
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
