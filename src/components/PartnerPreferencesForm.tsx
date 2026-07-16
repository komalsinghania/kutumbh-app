'use client';

import { PARTNER_SECTIONS, PartnerQuestion, PartnerQuestionId, PartnerPreferences } from '@/lib/partner-preferences';

interface Props {
  value: PartnerPreferences;
  onChange: (id: PartnerQuestionId, option: string) => void;
  /** Compact spacing for the profile editor; roomier for onboarding. */
  dense?: boolean;
}

const ACCENT = '#c13e2a';

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="pp-pill"
      style={{
        border: `1px solid ${selected ? ACCENT : '#e0d3bd'}`,
        background: selected ? 'linear-gradient(135deg, #d44d36 0%, #b83521 100%)' : '#fff',
        color: selected ? '#fff' : '#6b5e4d',
        boxShadow: selected ? '0 4px 12px rgba(193,62,42,0.28)' : '0 1px 2px rgba(80,50,20,0.04)',
        fontWeight: selected ? 700 : 500,
      }}
    >
      {label}
    </button>
  );
}

function Question({ q, value, onChange }: { q: PartnerQuestion; value?: string; onChange: (option: string) => void }) {
  return (
    <div className="pp-q">
      <div className="pp-q-label">{q.label}</div>
      <div className="pp-pills">
        {q.options.map(opt => (
          <Pill key={opt} label={opt} selected={value === opt} onClick={() => onChange(value === opt ? '' : opt)} />
        ))}
      </div>
    </div>
  );
}

/** The "What do you want in a partner" questionnaire — grouped single-select
 *  questions. Controlled: pass `value` and handle `onChange(id, option)`. An
 *  empty-string option clears that answer. */
export default function PartnerPreferencesForm({ value, onChange, dense = false }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dense ? 22 : 30, textAlign: 'left' }}>
      <style>{`
        .pp-section-label {
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
          color: ${ACCENT}; margin-bottom: 14px; display: flex; align-items: center; gap: 10px;
        }
        .pp-section-label::after { content: ''; flex: 1; height: 1px; background: #e6dbc4; }
        .pp-q { margin-bottom: 16px; }
        .pp-q:last-child { margin-bottom: 0; }
        .pp-q-label { font-size: 0.92rem; font-weight: 600; color: #1a1410; margin-bottom: 9px; }
        .pp-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .pp-pill {
          padding: 8px 15px; border-radius: 999px; font-size: 0.82rem; cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
          white-space: nowrap;
        }
        .pp-pill:hover { transform: translateY(-1px); }
        .pp-pill:active { transform: translateY(0); }
      `}</style>

      {PARTNER_SECTIONS.map(section => (
        <section key={section.label}>
          <div className="pp-section-label">{section.label}</div>
          <div>
            {section.questions.map(q => (
              <Question key={q.id} q={q} value={value[q.id]} onChange={opt => onChange(q.id, opt)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
