import { useStore } from '../state/store';
import { statusIcon } from './icons';
import { formatAgo, formatClock } from '../lib/format';

/** The single most important element: is this manhole safe right now? */
export function StatusHero() {
  const { selected, selectedTelemetry: t, assessment, now, provider } = useStore();
  const { status, headline, subtitle } = assessment;

  return (
    <section className="panel hero area-hero" aria-live="polite">
      <div className="hero-icon">{statusIcon(status, 46)}</div>
      <div className="hero-text">
        <h1 className="hero-title">{headline}</h1>
        <p className="hero-sub">{subtitle}</p>
        <div className="hero-meta">
          <span className="chip mono">{selected.id} · {selected.name}</span>
          <span className="chip">
            Depth {selected.depthCm} cm
          </span>
          <span className="chip">
            Telemetry {formatClock(t.timestamp)} ({formatAgo(t.timestamp, now)})
          </span>
          <span className="chip" title={provider.label}>
            {provider.kind === 'simulated' ? 'Simulated feed' : 'Live feed'}
          </span>
        </div>
      </div>
    </section>
  );
}
