/**
 * RokaMaybe landing page — a Server Component.
 *
 * This page must render its copy on the server. Search engines and AI answer
 * engines read the first HTTP response without executing JavaScript, so any
 * content that only appears after hydration is invisible to them. It used to
 * sit behind an auth-loading splash and the whole page shipped as one client
 * bundle; both are fixed here.
 *
 * The shape is server shell + client islands: everything static (hero copy,
 * mockup, icons, feature index, FAQs) renders on the server, and only the
 * genuinely interactive parts — scroll reveals, the rotator, the tilt, the
 * animated gauges and counters, the accordion, and the CTAs that need auth
 * state — are marked 'use client' in src/components/landing/.
 *
 * Anything added here must keep that property: never gate this page's content
 * on auth, and keep new interactivity in an island rather than making the page
 * a Client Component again.
 */

import Link from 'next/link';
import './landing.css';

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import JsonLd from '@/components/JsonLd';
import { webApplicationJsonLd, faqPageJsonLd } from '@/lib/structured-data';
import { TICKER_1, TICKER_2, CHAOS_CARDS, RED_FLAGS, FAQS } from '@/lib/landing-content';

// Server pieces — pure markup, never shipped as JavaScript.
import Mandala from '@/components/landing/Mandala';
import Petals from '@/components/landing/Petals';
import DashboardMock from '@/components/landing/DashboardMock';
import FlagCard from '@/components/landing/FlagCard';
import {
  IconDoc, IconSparkle, IconTarget, IconPhone, IconFamily, IconCompare,
  IconLock, IconNoAds, IconExport, IconTrash, IconIndia,
} from '@/components/landing/icons';

// Client islands — the only parts that need to run in the browser.
import Reveal from '@/components/landing/Reveal';
import WordRotator from '@/components/landing/WordRotator';
import TiltStage from '@/components/landing/TiltStage';
import KundliGauge from '@/components/landing/KundliGauge';
import StagePipeline from '@/components/landing/StagePipeline';
import StatCounter from '@/components/landing/StatCounter';
import FaqAccordion from '@/components/landing/FaqAccordion';
import LandingCta from '@/components/landing/LandingCta';

export default function LandingPage() {
  return (
    <>
      {/* Homepage structured data — what the product is, and the same FAQs
          rendered below in a form answer engines can quote directly. */}
      <JsonLd data={webApplicationJsonLd} />
      <JsonLd data={faqPageJsonLd(FAQS)} />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <SiteHeader overHero />

      <main style={{ background: '#f5ede0' }}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="lp-hero">
          <Mandala />
          <Petals />
          <div className="lp-hero-grain" />

          <div className="lp-hero-inner">
            <div className="lp-hero-badge">
              <span className="lp-dot" />
              Early access — every feature free, no card needed
            </div>

            <h1 className="lp-hero-title">
              Your rishta search,
              <br />
              <WordRotator />
            </h1>

            <p className="lp-hero-sub">
              RokaMaybe is the private tracker for your arranged-marriage journey.
              AI reads the biodatas, matches the kundlis, logs the calls, and remembers
              every red flag — so when Mummy asks, you actually have answers.
            </p>

            <div className="lp-hero-ctas">
              <LandingCta placement="hero" className="lp-btn-primary">
                Start Free — it&apos;s 2 minutes
              </LandingCta>
              <a className="lp-btn-ghost" href="#chaos">
                See the chaos ↓
              </a>
            </div>

            <p className="lp-hero-trust">
              🔒 Private by default · No matches shown · No aunty notified
            </p>

            {/* Mockup + floating chips */}
            <div className="lp-mock-stage">
              <div className="lp-mock-glow" />

              <span className="lp-chip" style={{ top: '-8%', left: '-9%', '--chip-rot': '-4deg', '--chip-dur': '6s' } as React.CSSProperties}>
                <span className="lp-chip-num">27/36</span> Kundli — Shubh ✦
              </span>
              <span className="lp-chip" style={{ top: '-4%', right: '-8%', '--chip-rot': '3deg', '--chip-dur': '7s', '--chip-delay': '0.9s' } as React.CSSProperties}>
                🚩 Red flag logged — &ldquo;cooks only Maggi&rdquo;
              </span>
              <span className="lp-chip" style={{ bottom: '16%', left: '-12%', '--chip-rot': '2deg', '--chip-dur': '6.5s', '--chip-delay': '1.6s' } as React.CSSProperties}>
                Step <span className="lp-chip-num">2</span>/5 · Follow-up call due
              </span>
              <span className="lp-chip" style={{ bottom: '-5%', right: '-10%', '--chip-rot': '-2.5deg', '--chip-dur': '7.5s', '--chip-delay': '0.4s' } as React.CSSProperties}>
                📎 Mummy forwarded 3 new biodatas
              </span>

              <TiltStage>
                <DashboardMock />
              </TiltStage>
            </div>
          </div>
        </section>

        {/* ── TICKER ───────────────────────────────────────────────────── */}
        <div className="lp-ticker-wrap">
          <div className="lp-ticker">
            <div className="lp-ticker-track" style={{ '--ticker-dur': '28s' } as React.CSSProperties}>
              {[...TICKER_1, ...TICKER_1].map((t, i) => (
                <span className="lp-ticker-item" key={i}>
                  <span className="lp-ticker-star">✦</span>{t}
                </span>
              ))}
            </div>
          </div>
          <div className="lp-ticker lp-ticker-alt">
            <div className="lp-ticker-track" style={{ '--ticker-dur': '34s' } as React.CSSProperties}>
              {[...TICKER_2, ...TICKER_2, ...TICKER_2].map((t, i) => (
                <span className="lp-ticker-item" key={i}>
                  <span className="lp-ticker-star">✦</span>{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── WHAT THIS IS ─────────────────────────────────────────────── */}
        {/* Plain prose, high on the page. Search and AI systems answer "what is
            RokaMaybe" by quoting text like this; before it existed the most
            substantial copy on the homepage was a decorative mockup. */}
        <section className="lp-section" style={{ paddingBottom: 0 }}>
          <div className="lp-container">
            <Reveal>
              <p className="lp-eyebrow">What this actually is</p>
              <h2 className="lp-h2">
                An arranged marriage tracker,
                <br />not a <em>matrimonial site.</em>
              </h2>
              <div className="lp-prose">
                <p>
                  RokaMaybe is an{' '}
                  <Link href="/arranged-marriage-tracker">arranged marriage tracker</Link> — a
                  private dashboard for the rishta search you are already having. It shows you
                  no new matches, introduces you to nobody, and puts your profile in front of
                  no one. The people in it are the ones already coming to you: from matrimonial
                  sites, from the family pandit, from a cousin who knows someone nice.
                </p>
                <p>
                  What it does is hold all of it in one place. Upload a biodata as a PDF, a Word
                  file, or a photo off WhatsApp and AI fills in the details in about thirty
                  seconds. Kundli matching runs the full 36-point Ashtakoot from real birth
                  details, flagging Nadi, Bhakut and Gana dosha where they appear. Every call
                  gets a note, every family gets a scorecard of its own, and every red flag you
                  spot at eleven at night is still there next month when Mummy asks why you went
                  off that one.
                </p>
                <p>
                  Each rishta moves through five stages — new, call, meet, met, decision — so you
                  always know where things stand without scrolling back through three WhatsApp
                  threads. When it comes down to a final few, Compare puts up to three of them
                  side by side across eighteen dimensions. Your notes stay yours: nothing is
                  shared between users, nothing is sold, and you can delete all of it in one
                  click.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CHAOS ────────────────────────────────────────────────────── */}
        <section className="lp-section" id="chaos">
          <div className="lp-container">
            <Reveal>
              <p className="lp-eyebrow">The current situation</p>
              <h2 className="lp-h2">
                Sunday, 4 p.m. Mummy has questions.
                <br />You have <em>screenshots.</em>
              </h2>
              <p className="lp-lede">
                Twenty-seven biodatas across WhatsApp, three matrimonial apps, one pandit&apos;s
                blurry kundli photo, and a cousin who &ldquo;knows someone nice&rdquo;.
                This is not a search. This is chaos with a deadline.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="lp-chaos-board">
                {CHAOS_CARDS.map((c, i) => (
                  <div
                    key={i}
                    className={`lp-chaos-card ${c.cls}`}
                    style={{
                      ...c.pos,
                      '--chip-rot': `${c.rot}deg`,
                      '--chip-dur': `${c.dur}s`,
                      '--chip-delay': `${c.delay}s`,
                    } as React.CSSProperties}
                  >
                    <span className="lp-chaos-tag">{c.tag}</span>
                    {c.text}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURES INDEX ───────────────────────────────────────────── */}
        <section className="lp-section" id="features" style={{ paddingTop: 0 }}>
          <div className="lp-container">
            <div className="lp-feat-grid">

              {/* Left rail: headline + the headliner feature */}
              <div className="lp-feat-left">
                <Reveal>
                  <p className="lp-eyebrow">The fix</p>
                  <h2 className="lp-h2">One dashboard. <em>Zero</em> lost rishtas.</h2>
                  <p className="lp-lede">
                    Everything you&apos;re juggling in your head, your gallery, and four family
                    group chats — structured, scored, and searchable.
                  </p>
                </Reveal>
                <Reveal delay={0.1}>
                  <div className="lp-feat-hero">
                    <div className="lp-feat-hero-glow" />
                    <div className="lp-feat-hero-top">
                      <span className="lp-feat-hero-num">№ 01</span>
                      <span className="lp-feat-hero-tag"><IconSparkle /> Vedic astronomy</span>
                    </div>
                    <h3 className="lp-feat-hero-title">Real 36-guna Kundli Milan. Not a gimmick.</h3>
                    <p className="lp-feat-hero-body">
                      Full Ashtakoot matching computed from actual birth details — Nadi,
                      Bhakut, and Gana doshas flagged automatically. (Still consult your
                      pandit for the final word. We insist.)
                    </p>
                    <KundliGauge />
                  </div>
                </Reveal>
              </div>

              {/* Right rail: the feature index */}
              <div className="lp-feat-list">
                {[
                  {
                    n: '02', icon: <IconDoc />, title: <>AI reads biodatas so you don&apos;t have to</>,
                    body: <>Drop a PDF, Word doc, or a photo from WhatsApp. In 30 seconds every
                      field is filled — name, age, family, kundli details, the works.</>,
                  },
                  {
                    n: '03', icon: <IconTarget />, title: <>A 5-step journey, zero &ldquo;umm, let me check&rdquo;</>,
                    body: <>From &ldquo;new lead&rdquo; to &ldquo;decision&rdquo; — one clear journey bar
                      tells you exactly where every conversation stands.</>,
                    widget: <div style={{ marginTop: 18, maxWidth: 380 }}><StagePipeline /></div>,
                  },
                  {
                    n: '04', icon: <IconPhone />, title: <>A journal for every call</>,
                    body: <>Who you talked to, what was said, how you felt after. Next Sunday,
                      you&apos;ll have receipts.</>,
                  },
                  {
                    n: '05', icon: <IconFamily />, title: <>Rate the family separately</>,
                    body: <>Sometimes the person is lovely and the family is a red-flag factory.
                      Eight dimensions, five stars each. You&apos;ll know.</>,
                  },
                  {
                    n: '06', icon: <IconCompare />, title: <>Decision Matrix, for D-day</>,
                    body: <>Compare up to 3 prospects side by side on 18 dimensions. The best
                      kundli isn&apos;t always the right answer.</>,
                  },
                ].map((f, i) => (
                  <Reveal key={f.n} delay={i * 0.07}>
                    <div className="lp-feat-row">
                      <span className="lp-feat-num">{f.n}</span>
                      <div>
                        <h3 className="lp-feat-title">{f.title}</h3>
                        <p className="lp-feat-body">{f.body}</p>
                        {f.widget}
                      </div>
                      <span className="lp-feat-mark">
                        <span className="lp-feat-mark-icon">{f.icon}</span>
                        <span className="lp-feat-mark-arrow">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                        </span>
                      </span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <section className="lp-stats">
          <div className="lp-stats-grid">
            <Reveal delay={0}><StatCounter target={36} label="Guna points checked" /></Reveal>
            <Reveal delay={0.1}><StatCounter target={5} label="Steps to a decision" /></Reveal>
            <Reveal delay={0.2}><StatCounter target={30} suffix="s" label="To scan a biodata" /></Reveal>
            {/* <Reveal delay={0.3}><StatCounter target={0} label="Ads. Forever." /></Reveal> */}
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
        <section className="lp-section" id="how-it-works">
          <div className="lp-container">
            <Reveal>
              <p className="lp-eyebrow">Getting started</p>
              <h2 className="lp-h2">Three steps. <em>Fifteen</em> minutes.</h2>
            </Reveal>
            <div className="lp-steps">
              {[
                { n: '1', t: 'Sign up', b: 'Google or email — 30 seconds. No credit card, no interview, no aunty verification round.' },
                { n: '2', t: 'Set your preferences', b: 'Two minutes of tapping pills — city, age range, diet, income, family type. Done.' },
                { n: '3', t: 'Add prospects', b: 'One by one, or bulk-upload biodatas (PDF, Word, photo) and let the AI do the typing.' },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 0.12}>
                  <div className="lp-step">
                    <span className="lp-step-num">{s.n}</span>
                    <div className="lp-step-title">{s.t}</div>
                    <div className="lp-step-body">{s.b}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── RED FLAG WALL ────────────────────────────────────────────── */}
        <section className="lp-flags">
          <div className="lp-container" style={{ padding: '0 24px', textAlign: 'center' }}>
            <Reveal>
              <p className="lp-eyebrow" style={{ justifyContent: 'center' }}>From the field</p>
              <h2 className="lp-h2">The Red Flag <em>Hall of Fame.</em></h2>
              <p className="lp-lede" style={{ margin: '0 auto' }}>
                Real quotes from first calls and second meetings. Shared with permission.
                Logged forever. This is why the red flag log exists.
              </p>
            </Reveal>
          </div>
          <div className="lp-flag-row">
            <div className="lp-flag-track" style={{ '--flag-dur': '52s' } as React.CSSProperties}>
              {[...RED_FLAGS, ...RED_FLAGS].filter((_, i) => i % 2 === 0).map((f, i) => (
                <FlagCard key={i} f={f} i={i} />
              ))}
            </div>
          </div>
          <div className="lp-flag-row">
            <div className="lp-flag-track" style={{ '--flag-dur': '46s' } as React.CSSProperties}>
              {[...RED_FLAGS, ...RED_FLAGS].filter((_, i) => i % 2 === 1).map((f, i) => (
                <FlagCard key={i} f={f} i={i + 3} />
              ))}
            </div>
          </div>
        </section>

        {/* ── PRIVACY ──────────────────────────────────────────────────── */}
        <section className="lp-section">
          <div className="lp-container">
            <Reveal>
              <p className="lp-eyebrow">Trust &amp; privacy</p>
              <h2 className="lp-h2">Not a matrimonial app. <em>Never</em> will be.</h2>
              <p className="lp-lede">
                No matches shown. No profiles shared. No data sold. RokaMaybe is your
                private war room — nobody else gets in, not even us.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="lp-privacy-chips">
                {[
                  { Icon: IconLock, text: 'End-to-end private' },
                  { Icon: IconNoAds, text: 'No ads, ever' },
                  { Icon: IconExport, text: 'Export anytime' },
                  { Icon: IconTrash, text: 'Delete in one click' },
                  { Icon: IconIndia, text: 'Made in India, data in India' },
                ].map(({ Icon, text }) => (
                  <span className="lp-privacy-chip" key={text}><Icon />{text}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="lp-section" style={{ paddingTop: 0 }}>
          <div className="lp-container" style={{ maxWidth: 780 }}>
            <Reveal>
              <p className="lp-eyebrow">Common questions</p>
              <h2 className="lp-h2">Questions? <em>Obviously.</em></h2>
            </Reveal>
            <Reveal delay={0.1}>
              <FaqAccordion faqs={FAQS} />
            </Reveal>

            <Reveal delay={0.15}>
              <blockquote style={{
                margin: '56px auto 0', textAlign: 'center', maxWidth: 620,
              }}>
                <p style={{
                  fontFamily: 'var(--font-instrument, serif)', fontStyle: 'italic',
                  fontSize: 'clamp(19px, 2.6vw, 24px)', lineHeight: 1.6, color: '#1a1410', margin: 0,
                }}>
                  &ldquo;RokaMaybe was my sanity tool before it was an app.
                  Now it&apos;s yours too.&rdquo;
                </p>
                <footer style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: 14,
                  fontWeight: 700, color: '#c13e2a', marginTop: 14,
                }}>
                  — Komal Singhania, Founder
                </footer>
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <section className="lp-final">
          <span className="lp-final-ring" />
          <span className="lp-final-ring" />
          <span className="lp-final-ring" />
          <Reveal>
            <h2 className="lp-final-title">
              The shaadi is a <em>maybe.</em>
              <br />Your sanity shouldn&apos;t be.
            </h2>
            <p className="lp-final-sub">
              Free forever for the basics. Set up before your chai gets cold.
            </p>
            <LandingCta placement="final" className="lp-btn-final">
              Start Free — Find Your Maybe
            </LandingCta>
            <p className="lp-final-note">
              No credit card · No matches shown · No aunty notified
            </p>
          </Reveal>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <SiteFooter />
      </main>
    </>
  );
}
