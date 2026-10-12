import { useStore } from '../state/store';
import { waterPct } from '../model/evaluate';
import { toneClass } from '../lib/format';
import { IconDrop } from './icons';

export function WaterCard() {
  const { selected, selectedTelemetry: t, settings } = useStore();
  const noWater = t.waterLevel === null;
  const pct = noWater ? 0 : waterPct(t, selected);
  const th = settings.thresholds;
  const level =
    noWater || t.deviceStatus === 'offline'
      ? 'offline'
      : pct >= th.waterCritPct
        ? 'critical'
        : pct >= th.waterHighPct
          ? 'high'
          : pct >= th.waterWarnPct
            ? 'warning'
            : 'safe';

  const stateWord =
    level === 'offline'
      ? noWater
        ? 'NO DATA'
        : 'STALE'
      : level === 'safe'
        ? 'NORMAL'
        : level === 'warning'
          ? 'WARNING'
          : level === 'high'
            ? 'HIGH RISK'
            : 'CRITICAL';

  return (
    <section className="panel area-water">
      <div className="panel-head">
        <h2 className="panel-title">
          <IconDrop size={13} /> Water level
        </h2>
        <span className="panel-note">ultrasonic</span>
      </div>
      <div className="panel-body">
        <div className="water-wrap">
          <div
            className="tank"
            role="img"
            aria-label={noWater ? 'Water level: no data' : `Water level ${pct} percent`}
          >
            <div className={`tank-fill level-${level}`} style={{ height: `${pct}%` }} />
            <div className="tank-mark" style={{ bottom: `${th.waterCritPct}%` }}>
              <span>C {th.waterCritPct}</span>
            </div>
            <div className="tank-mark" style={{ bottom: `${th.waterHighPct}%` }}>
              <span>H {th.waterHighPct}</span>
            </div>
            <div className="tank-mark" style={{ bottom: `${th.waterWarnPct}%` }}>
              <span>W {th.waterWarnPct}</span>
            </div>
          </div>
          <div className="water-info">
            <div className="water-label">Current level</div>
            <div className={`water-pct ${toneClass(level)}`}>{noWater ? '—' : `${pct}%`}</div>
            <div className="water-cm">{noWater ? '—' : `${t.waterLevel} cm`}</div>
            <div className="water-depth">Depth: {selected.depthCm} cm</div>
            <div style={{ marginTop: 6 }}>
              <span className={`chip ${toneClass(level)}`}>
                <span className="dot" /> {stateWord}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
