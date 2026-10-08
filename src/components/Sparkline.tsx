interface Props {
  values: number[];
  color: string;
}

/** Minimal trend line for the detail page — no axes, no chart chrome. */
export function Sparkline({ values, color }: Props) {
  if (values.length < 2) {
    return <span className="muted" style={{ fontSize: 11 }}>collecting…</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 27 - ((v - min) / span) * 22;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
