import { useStore } from '../state/store';
import { waterPct } from '../model/evaluate';
import { fmtSensor } from '../lib/format';

const CYAN = '#38bdf8';
const LABEL = '#98a2b3';
const SUB = '#6d7789';

interface Props {
  /** Optional overrides so the visual can be reused on the detail page. */
  pct?: number;
  gasText?: string;
  waterText?: string;
  linkText?: string;
}

/**
 * Illustrated cutaway of the physical IoT installation:
 * cover, gas sensor, ultrasonic level, vibration/tamper, Arduino controller
 * and the underground water, with glowing data links.
 */
export function ManholeCutaway(inProps: Props) {
  const { selected, selectedTelemetry: t, settings } = useStore();
  const pct = inProps.pct ?? waterPct(t, selected);
  const gasText =
    inProps.gasText ??
    (t.hasData
      ? t.gasUnit === 'ppm'
        ? `CH₄ ${fmtSensor(t.ch4)} · CO ${fmtSensor(t.co)} · H₂S ${fmtSensor(t.h2s)} ppm`
        : `CH₄ ${fmtSensor(t.ch4)} · CO ${fmtSensor(t.co)} · H₂S ${fmtSensor(t.h2s)} raw`
      : 'no telemetry');
  const waterText =
    inProps.waterText ?? (t.waterLevel === null ? 'no data' : `${t.waterLevel} cm · ${pct}%`);
  const linkText =
    inProps.linkText ??
    (t.linkStatus === 'connected' ? (t.linkDetail ?? 'USB serial') : 'link down');

  // Water surface inside the shaft (interior runs y=118…402).
  const interiorTop = 118;
  const interiorBottom = 402;
  const waterY = interiorBottom - (Math.min(100, pct) / 100) * (interiorBottom - interiorTop);
  const levelColor =
    pct >= settings.thresholds.waterCritPct
      ? '#f4574f'
      : pct >= settings.thresholds.waterHighPct
        ? '#fb923c'
        : pct >= settings.thresholds.waterWarnPct
          ? '#fbbf24'
          : CYAN;

  const online = t.deviceStatus === 'online';
  const bus = online ? CYAN : '#8a93a5';

  return (
    <section className="panel area-visual">
      <div className="panel-head">
        <h2 className="panel-title">System visual — cutaway</h2>
        <span className="panel-note">{selected.id} · physical layout</span>
      </div>
      <div className="visual-wrap">
        <svg
          className="visual-svg"
          viewBox="0 0 760 430"
          role="img"
          aria-label="Cutaway illustration of the monitored manhole and its sensors"
        >
          <defs>
            <linearGradient id="earth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#12141a" />
              <stop offset="1" stopColor="#0d0f14" />
            </linearGradient>
            <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={levelColor} stopOpacity="0.42" />
              <stop offset="1" stopColor={levelColor} stopOpacity="0.10" />
            </linearGradient>
            <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b0e14" />
              <stop offset="1" stopColor="#070a0f" />
            </linearGradient>
          </defs>

          {/* ---- earth block with the shaft cut out ---- */}
          <path
            fillRule="evenodd"
            fill="url(#earth)"
            d="M0 112 H760 V430 H0 Z M300 112 V430 H470 V112 Z"
          />
          {/* strata */}
          {[150, 196, 244, 296, 352, 404].map((y) => (
            <g key={y}>
              <path
                d={`M0 ${y} C 90 ${y - 6}, 210 ${y + 7}, 300 ${y}`}
                stroke="rgba(255,255,255,0.05)"
                fill="none"
              />
              <path
                d={`M470 ${y} C 560 ${y + 6}, 660 ${y - 7}, 760 ${y}`}
                stroke="rgba(255,255,255,0.05)"
                fill="none"
              />
            </g>
          ))}
          {/* pebbles */}
          {[
            [58, 168], [130, 210], [214, 184], [92, 268], [248, 300], [46, 330],
            [176, 356], [600, 176], [672, 226], [540, 250], [700, 300], [566, 336], [636, 372], [140, 400],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.6 : 1.7} fill="rgba(255,255,255,0.07)" />
          ))}

          {/* ---- road surface ---- */}
          <rect x="0" y="96" width="760" height="16" fill="#1a1f28" />
          <rect x="0" y="96" width="760" height="2.4" fill="#2b3342" />
          <g fill="rgba(255,255,255,0.28)">
            {[36, 108, 180, 546, 618, 690].map((x) => (
              <rect key={x} x={x} y="102" width="30" height="2.6" rx="1.3" />
            ))}
          </g>

          {/* ---- shaft interior ---- */}
          <rect x="300" y="112" width="170" height="318" fill="url(#shaft)" />
          {/* concrete walls with ring joints */}
          <rect x="300" y="112" width="15" height="318" fill="#252b35" />
          <rect x="455" y="112" width="15" height="318" fill="#252b35" />
          <rect x="300" y="112" width="15" height="318" fill="none" stroke="#333b48" />
          <rect x="455" y="112" width="15" height="318" fill="none" stroke="#333b48" />
          {[158, 206, 254, 302, 350, 398].map((y) => (
            <g key={y} stroke="#1b2029" strokeWidth="1.6">
              <line x1="300" y1={y} x2="315" y2={y} />
              <line x1="455" y1={y} x2="470" y2={y} />
            </g>
          ))}

          {/* ---- frame + cover ---- */}
          <rect x="292" y="94" width="186" height="18" rx="3" fill="#3a424f" />
          <rect x="292" y="94" width="186" height="3" fill="#4c5563" />
          <rect x="304" y="84" width="162" height="12" rx="4" fill="#4b5563" />
          <g stroke="#2d3441" strokeWidth="1.4">
            {[316, 334, 352, 370, 388, 406, 424, 442, 456].map((x) => (
              <line key={x} x1={x} y1="86" x2={x} y2="94" />
            ))}
          </g>

          {/* ---- water ---- */}
          <rect x="315" y={waterY} width="140" height={interiorBottom - waterY} fill="url(#water)" />
          <path
            d={`M315 ${waterY} q 17 -5 35 0 t 35 0 t 35 0 t 35 0`}
            stroke={levelColor}
            strokeWidth="2"
            fill="none"
            opacity="0.85"
          />
          <g stroke="rgba(255,255,255,0.05)">
            {[waterY + 24, waterY + 54, waterY + 84].map((y, i) =>
              y < interiorBottom ? <line key={i} x1="322" y1={y} x2="448" y2={y} /> : null,
            )}
          </g>

          {/* ---- data bus from sensors to the Arduino ---- */}
          <g stroke={bus} strokeWidth="1.2" fill="none" opacity="0.55" strokeDasharray="4 4">
            <path d="M356 178 C 386 196, 396 226, 412 254" />
            <path d="M404 136 C 420 170, 430 200, 436 246" />
            <path d="M386 124 C 372 150, 366 170, 360 196" />
          </g>
          {/* glowing link nodes */}
          {[
            [356, 178], [404, 136], [386, 124], [440, 286],
          ].map(([x, y], i) => (
            <circle
              key={i}
              className="node-glow"
              cx={x}
              cy={y}
              r="3.4"
              fill={bus}
              style={{ animationDelay: `${i * 0.45}s` }}
            />
          ))}

          {/* ---- vibration / tamper (under cover) ---- */}
          <g>
            <rect x="368" y="110" width="38" height="16" rx="3" fill="#232a35" stroke="#39424f" />
            <circle cx="378" cy="118" r="3.2" fill="#8a93a5" />
            <rect x="386" y="115" width="15" height="6" rx="1.5" fill="#fbbf24" opacity="0.75" />
          </g>

          {/* ---- gas sensor (left wall) ---- */}
          <g>
            <rect x="315" y="164" width="34" height="26" rx="3" fill="#12352b" stroke="#1f5c4a" />
            <rect x="318" y="167" width="9" height="6" rx="1.4" fill="#2b3039" />
            <circle cx="340" cy="177" r="9" fill="#b9c0cb" />
            <circle cx="340" cy="177" r="9" fill="none" stroke="#7d8695" />
            <path d="M334 174h12M334 178h12M334 182h12" stroke="#5b6472" strokeWidth="1" />
            <rect x="349" y="172" width="6" height="10" rx="1.5" fill="#39424f" />
          </g>

          {/* ---- ultrasonic water-level sensor (top of shaft) ---- */}
          <g>
            <rect x="364" y="112" width="44" height="18" rx="3" fill="#123a52" stroke="#1f6f9c" />
            <rect x="370" y="130" width="13" height="9" rx="2" fill="#aeb6c2" />
            <rect x="389" y="130" width="13" height="9" rx="2" fill="#aeb6c2" />
            <path d="M376 140 L366 156 M376 140 L386 156" stroke="#38bdf8" strokeWidth="1" opacity="0.5" />
            <path d="M395 140 L385 156 M395 140 L405 156" stroke="#38bdf8" strokeWidth="1" opacity="0.5" />
            <path
              d={`M376 142 L356 ${Math.min(waterY, 340)} M395 142 L418 ${Math.min(waterY, 340)}`}
              stroke="#38bdf8"
              strokeWidth="0.9"
              strokeDasharray="3 5"
              opacity="0.4"
              fill="none"
            />
          </g>

          {/* ---- Arduino controller (right wall) ---- */}
          <g>
            <rect x="404" y="246" width="52" height="72" rx="4" fill="#0b4c57" stroke="#1f7d92" />
            <rect x="416" y="262" width="24" height="24" rx="2.5" fill="#15181d" stroke="#2a2f38" />
            <rect x="420" y="266" width="16" height="16" rx="1.5" fill="#1d2129" />
            <g stroke="#d7f3f8" strokeWidth="1.2" opacity="0.7">
              <path d="M410 250h40M410 254h40M410 258h30" />
            </g>
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={i} x={410 + i * 7} y="310" width="5" height="5" rx="1" fill="#c9a227" opacity="0.85" />
            ))}
            <circle cx="447" cy="306" r="3.4" fill={online ? '#34d399' : '#8a93a5'} />
            <circle cx="447" cy="306" r="6.5" fill={online ? '#34d399' : '#8a93a5'} opacity="0.25" />
            <text x="410" y="334" fill="#bfeef7" fontSize="7.5" fontFamily="monospace">
              ARDUINO
            </text>
          </g>

          {/* ---- USB serial link to the surface ---- */}
          <g stroke={online ? '#38bdf8' : '#8a93a5'} fill="none" strokeLinecap="round" opacity="0.85">
            <path d="M448 262 C 472 226, 486 156, 500 112" strokeWidth="1.6" strokeDasharray="5 5" />
            <rect x="490" y="98" width="22" height="12" rx="2" strokeWidth="1.4" fill="#1a1f28" />
            <path d="M496 98v-7M506 98v-7" strokeWidth="1.4" />
            <circle cx="448" cy="262" r="3.2" fill={online ? '#38bdf8' : '#8a93a5'} stroke="none" />
          </g>

          {/* ---- labels: left ---- */}
          <g fontFamily="sans-serif" fontSize="11" letterSpacing="1.4" fill={LABEL}>
            <text x="16" y="56">MANHOLE COVER</text>
            <line x1="150" y1="52" x2="300" y2="90" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 4" />
            <circle cx="300" cy="90" r="2.4" fill="rgba(255,255,255,0.45)" />

            <text x="16" y="152">VIBRATION / TAMPER</text>
            <line x1="182" y1="148" x2="366" y2="118" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 4" />
            <circle cx="366" cy="118" r="2.4" fill="rgba(255,255,255,0.45)" />

            <text x="16" y="236">GAS SENSOR</text>
            <text x="16" y="252" fontSize="10" fill={SUB} letterSpacing="0.6">
              {gasText}
            </text>
            <line x1="16" y1="244" x2="314" y2="178" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 4" />
            <circle cx="314" cy="178" r="2.4" fill="rgba(255,255,255,0.45)" />
          </g>

          {/* ---- labels: right ---- */}
          <g fontFamily="sans-serif" fontSize="11" letterSpacing="1.4" fill={LABEL} textAnchor="end">
            <text x="744" y="52">USB SERIAL</text>
            <text x="744" y="67" fontSize="10" fill={online ? '#7cc7ee' : SUB} letterSpacing="0.6">
              {linkText}
            </text>
            <line x1="640" y1="56" x2="516" y2="94" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 4" />

            <text x="744" y="146">ULTRASONIC LEVEL</text>
            <text x="744" y="161" fontSize="10" fill={SUB} letterSpacing="0.6">
              {waterText}
            </text>
            <line x1="556" y1="150" x2="414" y2="136" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 4" />
            <circle cx="414" cy="136" r="2.4" fill="rgba(255,255,255,0.45)" />

            <text x="744" y="292">ARDUINO CONTROLLER</text>
            <text x="744" y="307" fontSize="10" fill={online ? '#7ee6bf' : SUB} letterSpacing="0.6">
              {online
                ? `${t.linkStatus}${t.linkDetail ? ` · ${t.linkDetail}` : ''}`
                : t.hasData
                  ? 'device offline'
                  : 'no connection'}
            </text>
            <line x1="586" y1="296" x2="474" y2="286" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 4" />
            <circle cx="474" cy="286" r="2.4" fill="rgba(255,255,255,0.45)" />

            <text x="744" y="376">UNDERGROUND WATER</text>
            <text x="744" y="391" fontSize="10" fill={SUB} letterSpacing="0.6">
              depth {selected.depthCm} cm · {t.waterLevel === null ? 'no data' : `${pct}%`}
            </text>
            <line x1="596" y1="380" x2="474" y2={Math.max(waterY + 14, 200)} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 4" />
            <circle cx="474" cy={Math.max(waterY + 14, 200)} r="2.4" fill="rgba(255,255,255,0.45)" />
          </g>
        </svg>

        <div className="visual-legend">
          {[
            'Manhole cover',
            'Gas sensor (CH₄ / CO / H₂S)',
            'Ultrasonic water level',
            'Vibration / tamper',
            'Arduino controller',
            'Underground water',
          ].map((l) => (
            <span className="legend-item" key={l}>
              <span className="legend-dot" style={{ background: bus, boxShadow: `0 0 7px ${bus}` }} />
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
