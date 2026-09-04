import type { Metadata } from 'next';
import Link from 'next/link';
import { pageOpenGraph } from '@/lib/og';
import { PRICING_BADGE } from '@/lib/pricing';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import './page.css';

/**
 * The page for the search phrase "arranged marriage tracker".
 *
 * People type that exact string, and search and AI systems answer it by
 * looking for a page that is *about* it — the phrase in the title, the h1,
 * and the opening sentence, followed by real prose rather than a feature
 * grid. This is a Server Component, so all of that copy is in the HTML of
 * the first response, where crawlers that do not run JavaScript can read it.
 */

const DESCRIPTION =
  'RokaMaybe is an arranged marriage tracker — a private dashboard for the rishta search you are already having. Biodatas, kundli matching, calls and red flags in one place.';

export const metadata: Metadata = {
  title: 'Arranged Marriage Tracker',
  description: DESCRIPTION,
  keywords: [
    'arranged marriage tracker',
    'rishta tracker',
    'arranged marriage app',
    'biodata tracker',
    'kundli matching app',
    'shaadi tracker',
  ],
  alternates: {
    canonical: '/arranged-marriage-tracker',
  },
  openGraph: pageOpenGraph('Arranged Marriage Tracker — RokaMaybe', DESCRIPTION),
};

const PROBLEM_1 =
  'Nobody struggles to find rishtas. They arrive on their own — from matrimonial sites, from the family pandit, from your mother’s WhatsApp groups, from a cousin who knows someone nice. Twenty-seven biodatas in four months is an ordinary number.';
const PROBLEM_2 =
  'What is missing is anywhere to put them. The biodatas sit in a chat you cannot search. The kundli report is on paper, somewhere. You spoke to someone on Tuesday and cannot now recall whether he was the one moving to Dubai or the one with the joint family in Jaipur. Meanwhile the same three questions arrive every Sunday: what happened with that one, what was his kundli score, and why did you say no.';
const PROBLEM_PULL = 'Nobody needs more rishtas. Everybody needs a system.';

const DOES_1 =
  'Upload a biodata as a PDF, a Word file, or a photo taken off WhatsApp. AI reads it and fills in the profile — name, age, education, profession, family details, birth details — in about thirty seconds. Nothing is saved until you have looked it over.';
const DOES_2 =
  'Kundli matching runs the full 36-point Ashtakoot, computed from real Vedic astronomy using the birth details rather than looked up in a table, and flags Nadi, Bhakut and Gana dosha where they appear. Your pandit still gets the final word. We insist on that.';
const DOES_3 =
  'Each rishta then moves through five stages — new, call, meet, met, decision — so you always know where a conversation stands. Every call gets a note: who you spoke to, what was said, how you felt afterwards. The family is rated separately from the person across eight dimensions, because sometimes the person is lovely and the family is not. Red flags get logged the night you notice them rather than reconstructed from memory six weeks later.';
const DOES_4 =
  'When it comes down to a final few, Compare puts up to three prospects side by side across eighteen dimensions — because the best kundli score is not automatically the right answer.';

const WHO_1 =
  'Anyone in the middle of an arranged marriage search who has more prospects than memory. Usually that is the person whose own biodata is being circulated, though plenty of parents use it too — often a mother keeping track on behalf of a daughter who is working full time.';
const WHO_2 =
  'It will suit you if you are speaking to several people at once, if the details have started to blur into each other, or if you have ever had to say “let me check and get back to you” about someone you met three weeks ago.';

const DIFF_THEM = [
  'Shows you new profiles and suggests matches',
  'Puts your profile in front of strangers',
  'Its business is making introductions',
  'Your details are what it has to sell',
];
const DIFF_US = [
  'Tracks the prospects already coming to you',
  'Shows your information to nobody, ever',
  'Its job starts after the introduction is made',
  'Nothing shared between users, nothing sold',
];
const DIFF_AFTER =
  'Which means RokaMaybe sits alongside whatever you are already using rather than replacing it. Keep the matrimonial accounts. Keep the pandit. Keep the relatives with opinions. Just stop trying to hold all of it in your head.';

const PRIVACY =
  'Your search stays yours. Prospect records are stored per user and visible only to you — nothing is shared between accounts, nothing is sold to anyone, and you can delete the whole thing in one click whenever you want.';

export default function ArrangedMarriageTrackerPage() {
  return (
    <div className="mkt-amt">
      <SiteHeader />

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <span className="eyebrow">Arranged marriage tracker</span>
          <h1>
            An arranged marriage tracker.
            <br />
            <em>Not another matrimonial site.</em>
          </h1>
          <p className="sub">
            RokaMaybe is an arranged marriage tracker — a private dashboard for the rishta
            search you are already having. It does not introduce you to anyone. It keeps
            track of the people who are already being introduced.
          </p>
        </div>
      </header>

      {/* THE PROBLEM */}
      <section className="story">
        <div className="wrap">
          <div className="story-grid">
            <div className="story-tag">The problem</div>
            <div>
              <h2>The rishtas arrive. The <em>system</em> doesn&rsquo;t.</h2>
              <p>{PROBLEM_1}</p>
              <p>{PROBLEM_2}</p>
              <p className="pull">{PROBLEM_PULL}</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IT DOES */}
      <section className="story alt">
        <div className="wrap">
          <div className="story-grid">
            <div className="story-tag">What it does</div>
            <div>
              <h2>
                One place, from first biodata to <em>final yes.</em>
              </h2>
              <p>{DOES_1}</p>
              <p>{DOES_2}</p>
              <p>{DOES_3}</p>
              <p>{DOES_4}</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section className="story">
        <div className="wrap">
          <div className="story-grid">
            <div className="story-tag">Who it is for</div>
            <div>
              <h2>
                For the person <em>actually doing the search.</em>
              </h2>
              <p>{WHO_1}</p>
              <p>{WHO_2}</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE DIFFERENCE */}
      <section className="story alt">
        <div className="wrap">
          <div className="story-grid">
            <div className="story-tag">The difference</div>
            <div>
              <h2>
                A matrimonial site finds people. <em>This one remembers them.</em>
              </h2>
              <div className="diff-cols">
                <div className="diff-col">
                  <h3>A matrimonial site</h3>
                  <div className="h-sub">Built to make introductions</div>
                  <ul>
                    {DIFF_THEM.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="diff-col ours">
                  <h3>RokaMaybe</h3>
                  <div className="h-sub">Built for everything after one</div>
                  <ul>
                    {DIFF_US.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p style={{ marginTop: 26 }}>{DIFF_AFTER}</p>
              <p>{PRIVACY}</p>
              <p>
                More detail on each feature is on the{' '}
                <Link className="inline-link" href="/features">
                  features page
                </Link>
                , and the{' '}
                <Link className="inline-link" href="/how-it-works">
                  how it works page
                </Link>{' '}
                walks through a search from first upload to final decision.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <div className="wrap">
          <span className="eyebrow">{PRICING_BADGE}</span>
          <h2>
            Start tracking.
            <br />
            <em>Stop guessing.</em>
          </h2>
          <p>Your first biodata upload takes under a minute. The clarity lasts the whole search.</p>
          <Link className="btn btn-paper" href="/">
            Start free →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
