import { useCallback, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { useStore } from '../state/store';
import { ArduinoTelemetryProvider, type ArduinoStatus } from '../data/arduino';

/**
 * Floating USB-serial control for the live Arduino feed.
 *
 * Only talks to the telemetry provider, so no dashboard page/component has
 * to change. MG-001 shows real values once connected; manholes whose devices
 * have never reported keep their honest "no data" state.
 */
export function SerialConnectButton() {
  const { provider } = useStore();
  const live = provider instanceof ArduinoTelemetryProvider ? provider : null;

  const status = useSyncExternalStore(
    useCallback((fn: () => void) => live?.subscribe(fn) ?? (() => undefined), [live]),
    () => live?.getStatus() ?? FALLBACK,
    () => live?.getStatus() ?? FALLBACK,
  );

  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  if (!live) return null;

  const connected = status.state === 'connected';
  const receiving = connected && status.lastReadingAt !== null;
  const actionable = status.state === 'idle' || status.state === 'lost' || status.state === 'error';

  const dotColor = receiving
    ? '#4ade80'
    : connected
      ? '#facc15'
      : status.state === 'lost' || status.state === 'error'
        ? '#f87171'
        : status.state === 'connecting'
          ? '#facc15'
          : '#94a3b8';

  const label = connected
    ? receiving
      ? 'USB serial live'
      : 'Port open · waiting for data'
    : status.state === 'connecting'
      ? 'Connecting…'
      : status.state === 'lost'
        ? 'Arduino unplugged'
        : status.state === 'unsupported'
          ? 'No Web Serial'
          : 'Not connected';

  return (
    <div
      style={shell}
      title={`${status.message} · live readings on ${LIVE_HINT} — other manholes need their own devices`}
    >
      <span aria-hidden style={{ ...dot, background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
      <span style={{ whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
        {label}
        <span style={{ color: '#64748b' }}> · {receiving ? LIVE_HINT : 'no data'}</span>
      </span>

      {actionable && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => live.connect())}
          style={{ ...btn, opacity: busy ? 0.6 : 1 }}
        >
          {status.state === 'idle' ? 'Connect Arduino' : 'Reconnect'}
        </button>
      )}
      {connected && (
        <button type="button" onClick={() => void run(() => live.disconnect())} style={{ ...btn, borderColor: '#f87171', color: '#f87171' }}>
          Stop
        </button>
      )}
      {status.state === 'unsupported' && (
        <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Chrome / Edge on localhost</span>
      )}
    </div>
  );
}

const LIVE_HINT = 'MG-001 live';

const FALLBACK: ArduinoStatus = {
  state: 'unsupported',
  message: 'Serial provider unavailable',
  lastReadingAt: null,
};

const shell: CSSProperties = {
  position: 'fixed',
  right: 18,
  bottom: 58,
  zIndex: 45,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 10,
  background: 'rgba(7, 9, 16, 0.94)',
  border: '1px solid rgba(251, 191, 36, 0.28)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 8px 26px rgba(0,0,0,0.45)',
  fontFamily: 'var(--mono, monospace)',
  fontSize: 11,
  color: '#cbd5e1',
};

const dot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  flex: '0 0 auto',
};

const btn: CSSProperties = {
  border: '1px solid #ffd88a',
  background: 'rgba(255,255,255,0.05)',
  color: '#ffd88a',
  fontFamily: 'inherit',
  fontSize: 10,
  fontWeight: 750,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '6px 10px',
  borderRadius: 7,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
