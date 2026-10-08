import { useStore } from '../state/store';

/**
 * Explains WHY the current state exists — the panel a reviewer reads
 * after the big status banner.
 */
export function CurrentRisk() {
  const { assessment, status } = useStore();

  const headline =
    status === 'safe'
      ? 'No immediate hazard detected'
      : status === 'critical'
        ? 'Critical condition'
        : status === 'high'
          ? 'High-risk condition'
          : status === 'offline'
            ? 'Device not reporting'
            : 'Attention required';

  const mark = (tone: string) => {
    if (tone === 'ok') return <span className="risk-mark tone-safe">✓</span>;
    if (tone === 'warning') return <span className="risk-mark tone-warning">⚠</span>;
    if (tone === 'high') return <span className="risk-mark tone-high">▲</span>;
    if (tone === 'critical') return <span className="risk-mark tone-critical">●</span>;
    return <span className="risk-mark tone-offline">■</span>;
  };

  return (
    <section className="panel area-risk">
      <div className="panel-head">
        <h2 className="panel-title">Current risk</h2>
        <span className="panel-note">why this state</span>
      </div>
      <div className="panel-body">
        <div className={`risk-headline tone-${status}`}>
          <span>{status === 'safe' ? '✓' : status === 'offline' ? '■' : status === 'critical' ? '●' : '⚠'}</span>
          {headline}
        </div>
        <ul className="risk-lines">
          {assessment.lines.map((l, i) => (
            <li
              key={`${l.text}-${i}`}
              className={`risk-line${l.tone === 'ok' ? ' tone-ok-soft' : ''}${l.tone !== 'ok' ? ` tone-${l.tone}` : ''}`}
            >
              {mark(l.tone)}
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
