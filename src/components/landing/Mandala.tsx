// Server Component — no hooks, no handlers, so none of this markup ships as
// JavaScript. It renders once on the server and arrives as HTML.


// Node and the browser can disagree on the last bits of a Math.cos/sin result,
// which React reports as a hydration mismatch now that the hero is server
// rendered. Three decimals is far finer than an 800-unit viewBox can show, and
// it makes the coordinates byte-identical on both sides.
const svgCoord = (n: number) => Math.round(n * 1000) / 1000;

export default function Mandala() {
  return (
    <div className="lp-mandala" aria-hidden="true">
      <svg viewBox="0 0 800 800" fill="none">
        <g className="lp-mandala-outer">
          <circle cx="400" cy="400" r="368" stroke="rgba(232,200,112,0.14)" strokeWidth="1" strokeDasharray="3 14" />
          <circle cx="400" cy="400" r="330" stroke="rgba(193,62,42,0.16)" strokeWidth="1" strokeDasharray="1 10" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i * 15 * Math.PI) / 180;
            const x1 = svgCoord(400 + Math.cos(a) * 340), y1 = svgCoord(400 + Math.sin(a) * 340);
            const x2 = svgCoord(400 + Math.cos(a) * 360), y2 = svgCoord(400 + Math.sin(a) * 360);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(232,200,112,0.18)" strokeWidth="1.5" />;
          })}
        </g>
        <g className="lp-mandala-inner">
          <circle cx="400" cy="400" r="255" stroke="rgba(232,200,112,0.10)" strokeWidth="1" strokeDasharray="2 12" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const x = svgCoord(400 + Math.cos(a) * 255), y = svgCoord(400 + Math.sin(a) * 255);
            return <circle key={i} cx={x} cy={y} r="3" fill="rgba(193,62,42,0.28)" />;
          })}
        </g>
      </svg>
    </div>
  );
}
