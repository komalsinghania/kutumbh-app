import type { Metadata } from 'next';
import Link from 'next/link';
import './page.css';

export const metadata: Metadata = {
  title: 'About — RokaMaybe',
  description:
    'Why RokaMaybe exists: one place for every biodata, call, kundli, and decision in your rishta search. Built by someone who was living the chaos.',
};

const HERO_SUB =
  "RokaMaybe started as one person's attempt to survive her own rishta search. Here is the whole story — the why, and the what.";

const WHY_P1 =
  "You know how it goes. Biodatas piling up in WhatsApp. Your dad's friend sent 'a very good profile' last Tuesday and you can't find it. The pandit gave you a kundli report on paper and you've already lost it. You had a call with someone last week and now you can't remember if he was the one who wanted to move abroad or the one with the joint family in Jaipur. Your mom keeps asking for updates. You don't have updates. You just have chaos.";
const WHY_P2 =
  "Matrimonial apps don't fix this. They just add more profiles to the chaos. Pandits don't fix it. Relatives definitely don't fix it. So I built RokaMaybe — the thing I wished existed when I started my own search.";
const WHY_PULL = "You don't have updates. You just have chaos.";

const WHAT_P1 =
  "Upload a biodata — AI reads every detail and fills it in for you. Track each person through stages, from first introduction to final yes-or-no. Log your calls so you don't forget what you talked about. Rate the family separately from the person. Flag the weird stuff before you forget it. And when it's time to decide, compare them side by side — not just on income and education, but on everything that actually matters.";
const WHAT_P2 =
  'This is not another matrimonial site. This is the quiet, private dashboard you actually needed.';

const LINKS = [
  {
    k: 'The app',
    title: 'Everything it does',
    body: 'Kundli milan, call logs, red flags, family scores, and the decision matrix — every feature on one page.',
    href: '/features',
  },
  {
    k: 'The flow',
    title: 'From biodata to yes',
    body: 'Four honest steps — upload, auto-fill, track, decide. See exactly how the search flows.',
    href: '/how-it-works',
  },
  {
    k: 'The cost',
    title: 'Pay once, till your roka',
    body: "Free for 3 prospects. ₹499 once when you're ready to compare. No subscriptions.",
    href: '/pricing',
  },
];

export default function AboutPage() {
  return (
    <div className="mkt-about">
      <nav>
        <div className="nav-in">
          <Link className="wm" href="/">
            Roka<span className="maybe">Maybe</span>
          </Link>
          <div className="nav-links">
            <Link href="/features">Features</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/mummy-mode" className="hide-m">
              Mummy Mode
            </Link>
            <Link href="/about" className="active">
              About
            </Link>
            <Link href="/" className="nav-cta">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <span className="eyebrow">About · The story</span>
          <h1>
            Built from the middle of the <em>chaos.</em>
          </h1>
          <p className="sub">{HERO_SUB}</p>
          <p className="founder">— Komal Singhania, founder of RokaMaybe</p>
        </div>
      </header>

      {/* THE WHY */}
      <section className="story">
        <div className="wrap">
          <div className="story-grid">
            <div className="story-tag">The why</div>
            <div>
              <h2>
                Honestly? I built this because I was <em>losing it.</em>
              </h2>
              <p>{WHY_P1}</p>
              <p>{WHY_P2}</p>
              <p className="pull">{WHY_PULL}</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE WHAT */}
      <section className="story alt">
        <div className="wrap">
          <div className="story-grid">
            <div className="story-tag">The what</div>
            <div>
              <h2>
                One place for <em>everything.</em>
              </h2>
              <p>{WHAT_P1}</p>
              <p>{WHAT_P2}</p>
            </div>
          </div>
        </div>
      </section>

      {/* EXPLORE / LINKS */}
      <section className="explore">
        <div className="wrap">
          <span className="eyebrow">See it in detail</span>
          <h2>Where to go next</h2>
          <p className="lede">The rest of RokaMaybe, in three doors.</p>
          <div className="explore-grid">
            {LINKS.map((c) => (
              <Link key={c.href} href={c.href} className="explore-card">
                <span className="k">{c.k}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <span className="go">
                  Explore <span className="arw">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <div className="wrap">
          <span className="eyebrow">Free for 3 prospects · No card</span>
          <h2>
            Sort the maybes.
            <br />
            <em>Find the yes.</em>
          </h2>
          <p>Your first biodata upload takes under a minute. The clarity lasts the whole search.</p>
          <Link className="btn btn-paper" href="/">
            Start free →
          </Link>
        </div>
      </section>

      <footer>
        <span className="f-wm">
          Roka<em>Maybe</em>
        </span>
        The app for the maybe years
        <div className="f-links">
          <Link href="/features">Features</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/mummy-mode">Mummy Mode</Link>
          <Link href="/about">About</Link>
          <Link href="/blog">Blog</Link>
        </div>
      </footer>
    </div>
  );
}
