// Server Component — no hooks, no handlers, so none of this markup ships as
// JavaScript. It renders once on the server and arrives as HTML.


const FLAG_ROTS = [-1.5, 1, -0.8, 1.4, -0.5, 0.7];

export default function FlagCard({ f, i }: { f: { who: 'he' | 'she'; text: string }; i: number }) {
  return (
    <div className="lp-flag-card" style={{ '--chip-rot': `${FLAG_ROTS[i % FLAG_ROTS.length]}deg` } as React.CSSProperties}>
      <span className={`lp-flag-who ${f.who === 'he' ? 'lp-he' : 'lp-she'}`}>
        <span className="lp-flag-emoji">{f.who === 'he' ? '🙋‍♂️' : '🙋‍♀️'}</span>
        {f.who === 'he' ? 'He said' : 'She said'}
      </span>
      <p className="lp-flag-quote">&ldquo;{f.text}&rdquo;</p>
      <div className="lp-flag-foot">Shared with permission · Logged in RokaMaybe</div>
    </div>
  );
}
