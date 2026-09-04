// ─────────────────────────────────────────────────────────────────────────────
// Blog content lives here for now (no CMS yet).
//
// To add a new blog, append a new object to BLOG_POSTS below. Keep `slug`
// unique and URL-safe — it becomes the page URL: /blog/<slug>.
//
// When the admin blog editor is built later, this same BlogPost shape is what
// it should produce, so the rendering (BlogLayout + /blog routes) stays the same.
// ─────────────────────────────────────────────────────────────────────────────

/** A single piece of content inside a blog post, rendered by /blog/[slug]. */
export type BlogBlock =
  | { type: 'lead'; text: string }              // opening paragraph, slightly larger
  | { type: 'heading'; text: string }           // section heading (h2)
  | { type: 'paragraph'; text: string }         // normal paragraph
  | { type: 'list'; items: string[] }           // bulleted list
  | { type: 'cta'; text: string; buttonText: string; href: string }; // highlighted call-to-action

export interface BlogPost {
  /** URL-safe unique id; becomes /blog/<slug> */
  slug: string;
  title: string;
  /** Short summary shown on the blog index cards and used for SEO description. */
  excerpt: string;
  /** e.g. "Rishta Search" — shown as a small label. */
  category: string;
  /** ISO date (YYYY-MM-DD) the post was published. */
  publishedAt: string;
  /**
   * ISO date (YYYY-MM-DD) of the last meaningful edit, if the post has been
   * revised. Omit for posts that have not changed since publication.
   * Surfaced as schema.org dateModified, which is how search and answer
   * engines judge whether an article is still current.
   */
  updatedAt?: string;
  /** Rough reading time in minutes, shown next to the date. */
  readingMinutes: number;
  content: BlogBlock[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'hidden-problem-using-5-matrimonial-apps',
    title: 'The Hidden Problem With Using 5 Matrimonial Apps at Once',
    excerpt:
      'Using four or five matrimonial apps at the same time feels thorough, but it quietly scatters your search. Here is the real problem — and the fix.',
    category: 'Rishta Search',
    publishedAt: '2026-07-01',
    readingMinutes: 3,
    content: [
      {
        type: 'lead',
        text:
          'Most families searching for a rishta today are not using just one platform; they are using four or five at the same time. A profile on one app, an account on another, a couple of WhatsApp groups, and maybe a notebook or spreadsheet that nobody remembers to update. It feels thorough and productive. In reality, it usually works against you. Every additional app adds another inbox to check, another set of notifications to miss, and another place where a genuinely good proposal can quietly disappear without anyone noticing. This is the hidden problem behind the common advice to simply download a few matrimonial apps and see what happens.',
      },
      { type: 'heading', text: 'Why Using Multiple Matrimonial Apps Backfires' },
      {
        type: 'list',
        items: [
          'Every app comes with its own inbox, so interest requests, messages, and shortlists end up scattered across five different logins instead of living in one place.',
          'Notifications pile up fast, and within a couple of weeks most users stop checking half their apps regularly, missing responses from serious matches.',
          'A promising profile can get lost simply because nobody remembers which app it was found on, or what was last discussed with that family.',
          'Comparing two or three proposals side by side becomes difficult when every detail sits inside a separate app, each with its own format and layout.',
          'Timely follow-up suffers, since a message sent on one app three days ago is easy to forget while attention is on another.',
          'The emotional toll builds quietly; constant app switching turns what should be a considered, family-centred decision into a scattered and tiring task.',
          'Parents who are not very comfortable with technology often give up tracking more than one app, so a large part of the search happens without their input.',
          'Duplicate profiles across platforms cause confusion, with families sometimes reviewing the same person twice under different photos and different biodata versions.',
        ],
      },
      { type: 'heading', text: 'It Is Not the Apps, It Is the Missing System' },
      {
        type: 'paragraph',
        text:
          'The apps themselves are not really the problem; they are simply where profiles happen to live. The actual problem is that nobody has one single place to track what happens after a profile is found, across every app being used. That is an organizational problem, not an app problem, and it deserves a proper solution rather than another spreadsheet that gets abandoned within a week. A rishta search involves too many people, too many conversations, and too much emotional weight to be managed through memory and guesswork.',
      },
      {
        type: 'cta',
        text:
          'This is exactly why RokaMaybe was built. It works alongside whichever matrimonial apps and platforms your family is already using, and gives everyone one shared tracker for every proposal, conversation, and follow-up. No more losing good matches between five different logins. Start organizing your rishta search with RokaMaybe today.',
        buttonText: 'Start free',
        href: '/',
      },
    ],
  },
  {
    slug: 'arranged-marriage-red-flags-families-should-watch-for',
    title: 'Arranged Marriage Red Flags: What Every Family Should Watch For',
    excerpt:
      'A rishta search moves fast, and looking good on paper is not the same as being a good match. Here are the warning signs experienced families watch for.',
    category: 'Red Flags',
    publishedAt: '2026-07-02',
    readingMinutes: 3,
    content: [
      {
        type: 'lead',
        text:
          'An arranged marriage search moves fast. Between biodata exchanges, phone calls, and family meetings, it is easy to get swept up in the excitement of a proposal that looks good on paper. But looking good on paper and being a good match are two very different things. Knowing the common red flags in advance helps families ask better questions early, instead of discovering problems after emotional investment has already been made. Here is what experienced families and matchmakers consistently point to as warning signs during a rishta search.',
      },
      { type: 'heading', text: 'Common Red Flags to Watch For' },
      {
        type: 'list',
        items: [
          'Vague or inconsistent answers about work, income, or living arrangements, especially when questions are gently deflected instead of answered directly.',
          'Pressure to decide quickly, with repeated reminders that other families are also interested and a decision is needed within days.',
          'Biodata details that do not match what comes up during conversation, such as education, job title, or previous marital history.',
          'Unwillingness to share references or allow any background verification, even when asked politely by the other family.',
          'Dismissive or disrespectful behaviour toward one side of the family during introductory meetings, which often signals how future interactions will go.',
          'Excessive focus on dowry, gifts, or wedding scale early in the conversation, before compatibility has even been discussed.',
          'A pattern of broken commitments, such as missed calls, cancelled meetings, or repeatedly postponed video calls without real explanation.',
          'One side controlling all communication, where the individual is rarely allowed to speak for themselves during calls or meetings.',
        ],
      },
      { type: 'heading', text: 'Trust the Pattern, Not a Single Moment' },
      {
        type: 'paragraph',
        text:
          'One awkward conversation or one nervous phone call does not automatically mean a red flag. What matters is the pattern over multiple interactions. Families who track conversations properly, rather than relying on memory, are far better placed to spot these patterns early, because small inconsistencies become obvious once they are written down and reviewed together.',
      },
      {
        type: 'cta',
        text:
          'RokaMaybe lets you log every conversation, call, and family meeting against each profile, so patterns and inconsistencies are easy to spot before you move forward. Keep your rishta search organized and informed with RokaMaybe.',
        buttonText: 'Start free',
        href: '/',
      },
    ],
  },
  {
    slug: 'what-to-check-in-a-biodata-before-moving-forward',
    title: 'What to Check in a Biodata Before Moving Forward',
    excerpt:
      'A biodata carries far more than a photo and a job title. Here is a practical checklist of what to actually look for before you say yes to a first conversation.',
    category: 'Rishta Search',
    publishedAt: '2026-07-03',
    readingMinutes: 3,
    content: [
      {
        type: 'lead',
        text:
          'A biodata is usually the very first impression in an arranged marriage search, yet most people spend just a few minutes scanning it before deciding whether to proceed. That is a mistake. A biodata carries far more information than a photo and a job title, and reading it properly can save weeks of back and forth later. Here is a practical checklist of what to actually look for before you say yes to a first conversation.',
      },
      { type: 'heading', text: 'Key Things to Check in Every Biodata' },
      {
        type: 'list',
        items: [
          'Basic details such as full name, date of birth, height, and city, cross-checked later during the actual conversation to confirm consistency.',
          'Education and profession, including the specific institution and current organisation, which can usually be verified with a simple search.',
          'Family background, including the number of siblings, their marital status, and whether the family is nuclear or joint, since this affects daily life after marriage.',
          'Any previous marriage or engagement history, which should be stated clearly rather than left out or mentioned only later.',
          'Lifestyle preferences such as diet, smoking, drinking, and religious practice, so expectations are aligned from the very first conversation.',
          'Photos that are recent and clear, ideally more than one, since outdated or heavily edited photos are a common source of mismatched expectations.',
          'Contact details and reference points for the family, so verification and future communication can happen smoothly.',
        ],
      },
      { type: 'heading', text: 'A Biodata Is a Starting Point, Not the Full Picture' },
      {
        type: 'paragraph',
        text:
          'No biodata, however detailed, replaces an actual conversation. Its real value is helping you filter efficiently, so you spend your time and emotional energy only on profiles that genuinely fit what your family is looking for. The families who do this well usually keep notes against each biodata rather than relying on memory once the fifth or sixth proposal starts to blur into the others.',
      },
      {
        type: 'cta',
        text:
          'With RokaMaybe, you can save every biodata, add your own notes, and track how each conversation develops from that first read to the final decision, all in one organized place. Try RokaMaybe and never lose track of a proposal again.',
        buttonText: 'Start free',
        href: '/',
      },
    ],
  },
  {
    slug: 'ways-to-organize-your-rishta-search',
    title: 'Ways to Organize Your Rishta Search Without Losing Your Mind',
    excerpt:
      'Multiple profiles, opinions, calls, and follow-ups all at once. Here are practical ways to keep a rishta search organized from day one, without adding stress.',
    category: 'Rishta Search',
    publishedAt: '2026-07-04',
    readingMinutes: 3,
    content: [
      {
        type: 'lead',
        text:
          'Anyone who has been through a rishta search knows how quickly it can turn overwhelming. Multiple profiles, multiple relatives giving opinions, calls to schedule, and follow ups to remember, all happening at the same time. Most families start with good intentions and a notebook, and within a month the notebook is forgotten and half the details live only in someone’s memory. Here are practical ways to keep a rishta search organized from day one, without adding more stress to an already emotional process.',
      },
      { type: 'heading', text: 'Practical Ways to Stay Organized' },
      {
        type: 'list',
        items: [
          'Keep one central place for every profile under consideration, instead of relying on separate app inboxes, screenshots, and forwarded messages.',
          'Record the status of each proposal clearly, such as under review, waiting on a call, or family meeting scheduled, so nothing sits in limbo.',
          'Set reminders for follow-ups, since a promising proposal can easily go cold if nobody replies within a reasonable window.',
          'Involve the whole family in the same system, so parents and siblings are working from the same information instead of separate memories.',
          'Note down questions and concerns as they come up during each call, rather than trying to recall them days later before the next conversation.',
          'Review all active proposals together on a regular basis; weekly works well for most families, instead of reacting to whichever message arrives first.',
          'Separate genuinely active conversations from ones that have gone quiet, so energy goes toward proposals that are actually moving forward.',
        ],
      },
      { type: 'heading', text: 'Organization Reduces the Emotional Load' },
      {
        type: 'paragraph',
        text:
          'A rishta search is already an emotional process for everyone involved. Poor organization adds an unnecessary layer of stress on top of that, through missed calls, forgotten details, and repeated conversations that could have been avoided. Families who build a simple system early on consistently report a calmer, clearer search, because they are making decisions based on complete information rather than whatever they happen to remember.',
      },
      {
        type: 'cta',
        text:
          'RokaMaybe was built specifically for this. It gives your family one shared tracker for every proposal, conversation, and next step, so your rishta search stays organized from the very first biodata to the final yes. Start your search the organized way with RokaMaybe.',
        buttonText: 'Start free',
        href: '/',
      },
    ],
  },
  {
    slug: 'modern-arranged-marriage-tips-2026',
    title: 'Modern Arranged Marriage: Tips for Doing It Your Way in 2026',
    excerpt:
      'Arranged marriage in 2026 looks very different from a decade ago. Here are practical tips for blending tradition with a modern, informed approach.',
    category: 'Rishta Search',
    publishedAt: '2026-07-05',
    readingMinutes: 3,
    content: [
      {
        type: 'lead',
        text:
          'Arranged marriage in 2026 looks very different from how it did even a decade ago. Video calls before meeting in person, biodata shared over apps instead of paper, and far more say for the individual in whom they eventually marry. Yet the core idea remains the same: families helping their children find a life partner. The families who navigate this well are the ones who blend tradition with a more modern, informed approach. Here are practical tips for approaching a modern arranged marriage search thoughtfully.',
      },
      { type: 'heading', text: 'Tips for a Modern, Balanced Approach' },
      {
        type: 'list',
        items: [
          'Be clear about what you are looking for before you start, including values, lifestyle, and location, so early conversations are more meaningful.',
          'Let the individual take the lead in direct conversations, with parents supporting every interaction.',
          'Use video calls early in the process, since a fifteen-minute conversation often reveals more than several rounds of biodata exchange.',
          'Take time between meeting someone and making a decision; a modern search does not need to move at the pace of a rushed one.',
          'Ask direct questions about career plans, family expectations, and daily life preferences, rather than assuming these align just because the biodata looks good.',
          'Keep extended family opinions in perspective; useful as input, but the final comfort level should sit with the two people getting married.',
          'Use technology to stay organized rather than overwhelmed, since a search spread across many apps and message threads quickly becomes exhausting.',
        ],
      },
      { type: 'heading', text: 'Tradition and Modern Tools Can Work Together' },
      {
        type: 'paragraph',
        text:
          'A modern arranged marriage search does not mean abandoning tradition; it means approaching it with more information, more communication, and better tools than previous generations had access to. Families who combine the wisdom of arranged marriage with a genuinely organized, transparent process tend to reach confident decisions faster, and with far less friction along the way.',
      },
      {
        type: 'cta',
        text:
          'RokaMaybe brings that modern, organized approach to your rishta search, giving your whole family one clear view of every proposal and conversation. Bring your arranged marriage search into 2026, try RokaMaybe today.',
        buttonText: 'Start free',
        href: '/',
      },
    ],
  },
];

/** Posts sorted newest-first, for the blog index. */
export const BLOG_POSTS_SORTED: BlogPost[] = [...BLOG_POSTS].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
);

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** Byline shown on every post. */
export const BLOG_AUTHOR = {
  name: 'Komal Singhania',
  role: 'Founder, RokaMaybe',
};

/** A post's text with the markup stripped — used for word counts. */
export function postPlainText(post: BlogPost): string {
  return post.content
    .map((block) => {
      switch (block.type) {
        case 'list':
          return block.items.join(' ');
        case 'cta':
          return `${block.text} ${block.buttonText}`;
        default:
          return block.text;
      }
    })
    .join(' ');
}

/** Rough word count of a post, for schema.org wordCount. */
export function postWordCount(post: BlogPost): number {
  return postPlainText(post).split(/\s+/).filter(Boolean).length;
}

// Each category gets its own on-brand accent, threaded through cards and the
// article header via a CSS custom property (--cat) so everything stays in sync.
export const CATEGORY_COLORS: Record<string, string> = {
  'Rishta Search': '#c13e2a', // sindoor
  'Red Flags': '#b8892b', // brand gold — reads as "caution"
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#c13e2a';
}

/** Other posts to suggest at the end of an article — same category first. */
export function getRelatedPosts(slug: string, limit = 2): BlogPost[] {
  const current = getBlogPost(slug);
  if (!current) return [];
  const others = BLOG_POSTS_SORTED.filter((p) => p.slug !== slug);
  const sameCategory = others.filter((p) => p.category === current.category);
  const rest = others.filter((p) => p.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

/** Format an ISO date (YYYY-MM-DD) as e.g. "1 July 2026". */
export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
