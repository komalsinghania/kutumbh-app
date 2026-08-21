// Server Component — no hooks, no handlers, so none of this markup ships as
// JavaScript. It renders once on the server and arrives as HTML.


const PETALS = [
  { left: 4, dur: 15, delay: 0, color: '#e8c870', drift: 60, op: 0.55 },
  { left: 12, dur: 19, delay: 4, color: '#c13e2a', drift: -40, op: 0.4 },
  { left: 21, dur: 14, delay: 8, color: '#d8985a', drift: 50, op: 0.5 },
  { left: 33, dur: 21, delay: 2, color: '#e8c870', drift: -60, op: 0.35 },
  { left: 44, dur: 16, delay: 10, color: '#c13e2a', drift: 45, op: 0.45 },
  { left: 55, dur: 18, delay: 6, color: '#d8985a', drift: -30, op: 0.5 },
  { left: 64, dur: 13, delay: 12, color: '#e8c870', drift: 70, op: 0.55 },
  { left: 74, dur: 20, delay: 1, color: '#c13e2a', drift: -55, op: 0.38 },
  { left: 83, dur: 15, delay: 9, color: '#e8c870', drift: 40, op: 0.5 },
  { left: 92, dur: 17, delay: 5, color: '#d8985a', drift: -45, op: 0.45 },
];

export default function Petals() {
  return (
    <>
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="lp-petal"
          style={{
            left: `${p.left}%`,
            background: p.color,
            '--petal-dur': `${p.dur}s`,
            '--petal-delay': `${p.delay}s`,
            '--petal-drift': `${p.drift}px`,
            '--petal-op': p.op,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}
