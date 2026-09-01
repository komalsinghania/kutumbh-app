// Server Component — no hooks, no handlers, so none of this markup ships as
// JavaScript. It renders once on the server and arrives as HTML.


export default function DashboardMock() {
  return (
    <div className="lp-mock">
      {/* Browser chrome */}
      <div style={{
        background: '#ece3d2', padding: '11px 16px',
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: '1px solid #d6c9b0',
      }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
        <span style={{
          marginLeft: 12, flex: 1, maxWidth: 300,
          background: '#f5ede0', borderRadius: 6, padding: '3px 12px',
          fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 11, color: '#6b5e4d',
        }}>rokamaybe.com/dashboard</span>
      </div>
      {/* Body — The Rishta Report */}
      <div style={{ padding: '20px 24px 22px', background: '#f5ede0', textAlign: 'left' }}>
        {/* Masthead */}
        <div style={{
          fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b8892b', marginBottom: 6,
        }}>
          Your weekly companion · No. 10
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{
            fontFamily: 'var(--font-fraunces, serif)', fontVariationSettings: '"opsz" 144',
            fontSize: 27, fontWeight: 650, letterSpacing: '-0.02em', color: '#1a1410', lineHeight: 1,
          }}>
            The Rishta Report
          </div>
          <div style={{
            fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
            fontSize: 12, color: '#6b5e4d', textAlign: 'right', lineHeight: 1.35, whiteSpace: 'nowrap',
          }}>
            Sunday<br />5 July 2026
          </div>
        </div>
        <div style={{ height: 2, background: '#1a1410', margin: '12px 0 0' }} />

        {/* Stat columns */}
        <div className="lp-report-stats">
          {[
            { label: 'In pipeline', value: 'Four', color: '#1a1410', labelColor: '#b8892b' },
            { label: 'Best match', value: '67%', color: '#c13e2a', labelColor: '#2D6B4F' },
            { label: 'Avg warmth', value: '53%', color: '#2D6B4F', labelColor: '#b8892b' },
            { label: 'Needs you', value: 'Four calls', color: '#1a1410', labelColor: '#b8892b' },
          ].map((s) => (
            <div key={s.label} className="lp-report-stat">
              <div style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 8.5, fontWeight: 700,
                letterSpacing: '0.16em', textTransform: 'uppercase', color: s.labelColor, marginBottom: 5,
              }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-fraunces, serif)', fontSize: 19, fontWeight: 700,
                color: s.color, lineHeight: 1, whiteSpace: 'nowrap',
              }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Lead + diary */}
        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          {/* Lead */}
          <div style={{ flex: '1.5 1 300px', minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 8.5, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c13e2a', marginBottom: 10,
            }}>
              Lead — needs your attention
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 64, alignSelf: 'stretch', minHeight: 84, borderRadius: 4, flexShrink: 0,
                background: '#ecd8cd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 600, color: '#c98876',
              }}>
                NC
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: '#1a1410', lineHeight: 1.15 }}>
                  Nirbhay Chaturvedi
                </div>
                <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 10.5, color: '#6b5e4d', marginTop: 3 }}>
                  30 · Mumbai · Product Manager at a fintech
                </div>
                <div style={{
                  fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
                  fontSize: 12.5, color: '#1a1410', lineHeight: 1.5, marginTop: 7,
                }}>
                  &ldquo;At the Call stage — step 2 of 5. You spoke two days ago;
                  a follow-up is due to keep things warm.&rdquo;
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 11, fontWeight: 700,
                    color: '#fff7ea', background: '#c13e2a', borderRadius: 6, padding: '7px 14px',
                    boxShadow: '0 3px 10px rgba(193,62,42,0.3)', whiteSpace: 'nowrap',
                  }}>
                    Log Another Call
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
                    fontSize: 11.5, color: '#b8892b', whiteSpace: 'nowrap',
                  }}>
                    — kundli 27 of 36 ✦ <b>61%</b>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Diary */}
          <div style={{ flex: '1 1 210px', minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 8.5, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6b5e4d', marginBottom: 10,
            }}>
              Also in the diary
            </div>
            {[
              { name: 'Prateek Wadhwa', pct: '58%', meta: '32 · Pune · Chartered Accountant', note: 'On hold — paused 16 days ago.' },
              { name: 'Samarth Bhatnagar', pct: '54%', meta: '29 · Bengaluru · UX Designer', note: 'New biodata — first look pending.' },
            ].map((d, i) => (
              <div key={d.name} style={{
                paddingBottom: 9, marginBottom: 9,
                borderBottom: i === 0 ? '1px solid #ddd0ba' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 13.5, fontWeight: 700, color: '#1a1410' }}>
                    {d.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 12.5, fontWeight: 700, color: '#b8892b' }}>
                    {d.pct}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 10, color: '#6b5e4d', marginTop: 2 }}>
                  {d.meta}
                </div>
                <div style={{
                  fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
                  fontSize: 11, color: '#8a7b66', marginTop: 3,
                }}>
                  {d.note}
                </div>
              </div>
            ))}
            <div style={{
              background: '#fbf5e9', border: '1px solid #e4d8c2', borderRadius: 8,
              padding: '9px 12px',
            }}>
              <div style={{ fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic', fontSize: 11.5, color: '#1a1410', marginBottom: 2 }}>
                A note to self
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 10, color: '#6b5e4d', lineHeight: 1.5 }}>
                One prospect rests on hold — worth a review before the week is out.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
