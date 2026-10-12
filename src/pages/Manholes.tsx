import { useStore } from '../state/store';
import { assess } from '../model/evaluate';
import { fmtSensor, formatAgo, STATUS_LABEL, toneClass } from '../lib/format';
import { IconChevronRight } from '../components/icons';

export function Manholes() {
  const { manholes, telemetry, settings, navigate, select, now } = useStore();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Monitored manholes</h1>
          <p className="page-desc">
            Fleet status, latest telemetry and device condition. Select a manhole for the full
            technical view.
          </p>
        </div>
        <span className="chip">{manholes.length} nodes</span>
      </div>

      <div className="mh-grid">
        {manholes.map((m) => {
          const t = telemetry[m.id];
          const a = assess(t, m, settings.thresholds);
          const tone = toneClass(a.status);
          const waterPctValue =
            t.waterLevel === null ? null : Math.round((t.waterLevel / m.depthCm) * 100);
          const sensorOf = (key: string) => a.sensors.find((s) => s.key === key)!;

          return (
            <button
              key={m.id}
              className="mh-card"
              onClick={() => {
                select(m.id);
                navigate({ page: 'detail', id: m.id });
              }}
            >
              <div className="mh-card-top">
                <div>
                  <div className="mh-card-id">{m.id}</div>
                  <div className="mh-card-name">{m.name}</div>
                </div>
                <span className={`chip ${tone}`}>
                  <span
                    className="dot"
                    style={a.status === 'offline' ? { animation: 'none' } : undefined}
                  />
                  {STATUS_LABEL[a.status]}
                </span>
              </div>

              <div className="mh-card-body">
                <div className="mh-mini-grid">
                  <div className="mh-mini">
                    <div className="mh-mini-label">CH₄</div>
                    <div className={`mh-mini-value ${toneClass(sensorOf('ch4').level)}`}>
                      {fmtSensor(t.ch4)}
                      <span className="muted" style={{ fontSize: 10 }}>
                        {t.hasData ? ` ${t.gasUnit === 'ppm' ? 'ppm' : 'raw'}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="mh-mini">
                    <div className="mh-mini-label">CO</div>
                    <div className={`mh-mini-value ${toneClass(sensorOf('co').level)}`}>
                      {fmtSensor(t.co)}
                      <span className="muted" style={{ fontSize: 10 }}>
                        {t.hasData ? ` ${t.gasUnit === 'ppm' ? 'ppm' : 'raw'}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="mh-mini">
                    <div className="mh-mini-label">H₂S</div>
                    <div className={`mh-mini-value ${toneClass(sensorOf('h2s').level)}`}>
                      {fmtSensor(t.h2s)}
                      <span className="muted" style={{ fontSize: 10 }}>
                        {t.hasData ? ` ${t.gasUnit === 'ppm' ? 'ppm' : 'raw'}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="mh-mini">
                    <div className="mh-mini-label">Water</div>
                    <div className={`mh-mini-value ${toneClass(sensorOf('water').level)}`}>
                      {waterPctValue === null ? '—' : `${waterPctValue}%`}
                    </div>
                  </div>
                  <div className="mh-mini">
                    <div className="mh-mini-label">Power</div>
                    <div
                      className={`mh-mini-value ${
                        t.battery !== null && t.battery <= 30 ? 'tone-warning' : ''
                      }`}
                    >
                      {!t.hasData ? '—' : t.battery === null ? 'USB' : `${t.battery}%`}
                    </div>
                  </div>
                  <div className="mh-mini">
                    <div className="mh-mini-label">Cover</div>
                    <div
                      className={`mh-mini-value ${t.coverStatus === 'open' ? 'tone-warning' : ''}`}
                      style={{ fontSize: 13 }}
                    >
                      {t.coverStatus === null ? '—' : t.coverStatus.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="mh-card-foot">
                  <span>
                    {t.hasData
                      ? `${t.deviceStatus === 'online' ? 'Device online' : 'Device offline'} · updated ${formatAgo(t.timestamp, now)}`
                      : 'No data · never reported'}
                  </span>
                  <span className={tone} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Detail <IconChevronRight size={13} />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
