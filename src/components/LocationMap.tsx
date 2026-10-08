import { useStore } from '../state/store';
import { assess } from '../model/evaluate';
import type { StatusLevel } from '../model/types';

const MARKER: Record<StatusLevel, string> = {
  safe: '#34d399',
  warning: '#fbbf24',
  high: '#fb923c',
  critical: '#f4574f',
  offline: '#8a93a5',
};

const W = 400;
const H = 260;

/**
 * Schematic fleet map. Positions are layout coordinates from the fleet
 * configuration — deliberately not presented as GPS coordinates.
 */
export function LocationMap() {
  const { manholes, telemetry, settings, selectedId, select } = useStore();

  return (
    <section className="panel area-map">
      <div className="panel-head">
        <h2 className="panel-title">Location map</h2>
        <span className="panel-note">schematic · not to scale</span>
      </div>
      <div className="map-wrap">
        <svg
          className="map-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="Schematic map of monitored manholes"
        >
          <rect width={W} height={H} fill="#080b12" />
          {/* grid */}
          {Array.from({ length: 16 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * 25}
              y1={0}
              x2={i * 25}
              y2={H}
              stroke="rgba(255,255,255,0.035)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * 25}
              x2={W}
              y2={i * 25}
              stroke="rgba(255,255,255,0.035)"
              strokeWidth="1"
            />
          ))}
          {/* blocks */}
          <rect x="30" y="34" width="86" height="52" rx="4" fill="rgba(255,255,255,0.03)" />
          <rect x="168" y="42" width="74" height="44" rx="4" fill="rgba(255,255,255,0.03)" />
          <rect x="286" y="86" width="82" height="56" rx="4" fill="rgba(255,255,255,0.03)" />
          <rect x="52" y="150" width="94" height="62" rx="4" fill="rgba(255,255,255,0.03)" />
          <rect x="196" y="176" width="88" height="52" rx="4" fill="rgba(255,255,255,0.03)" />
          {/* roads */}
          <path d="M0 116 H400" stroke="#171d28" strokeWidth="13" />
          <path d="M0 116 H400" stroke="rgba(255,255,255,0.10)" strokeWidth="1" strokeDasharray="9 9" />
          <path d="M0 214 H400" stroke="#171d28" strokeWidth="10" />
          <path d="M146 0 V260" stroke="#171d28" strokeWidth="13" />
          <path d="M146 0 V260" stroke="rgba(255,255,255,0.10)" strokeWidth="1" strokeDasharray="9 9" />
          <path d="M272 0 V260" stroke="#171d28" strokeWidth="9" />
          <path d="M0 46 L146 46 L232 14 L400 14" stroke="#141a24" strokeWidth="8" fill="none" />

          {/* markers */}
          {manholes.map((m) => {
            const status = assess(telemetry[m.id], m, settings.thresholds).status;
            const color = MARKER[status];
            const cx = (m.mapPos.x / 100) * W;
            const cy = (m.mapPos.y / 100) * H;
            const selected = m.id === selectedId;
            return (
              <g
                key={m.id}
                className="map-marker"
                onClick={() => select(m.id)}
                role="button"
                tabIndex={0}
                aria-label={`${m.id} ${m.name}: ${status}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') select(m.id);
                }}
              >
                <circle cx={cx} cy={cy} r="16" fill="transparent" />
                {selected && (
                  <circle cx={cx} cy={cy} r="13" fill="none" stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.9" />
                )}
                <circle cx={cx} cy={cy} r="8.5" fill={color} opacity="0.16" />
                <circle cx={cx} cy={cy} r="5" fill={color} />
                <circle cx={cx} cy={cy} r="5" fill="none" stroke="#05070d" strokeWidth="1.4" />
                <text
                  x={cx + 11}
                  y={cy - 7}
                  fill={selected ? '#e7ecf3' : '#98a2b3'}
                  fontSize="9.5"
                  fontFamily="monospace"
                  letterSpacing="0.5"
                >
                  {m.id}
                </text>
              </g>
            );
          })}

          {/* legend */}
          <g transform={`translate(10 ${H - 16})`}>
            {(['safe', 'warning', 'critical', 'offline'] as StatusLevel[]).map((s, i) => (
              <g key={s} transform={`translate(${i * 74} 0)`}>
                <circle cx="4" cy="-3.5" r="4" fill={MARKER[s]} />
                <text x="13" y="0" fill="#6d7789" fontSize="9" letterSpacing="1.1">
                  {s === 'high' ? 'HIGH' : s.toUpperCase()}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </section>
  );
}
