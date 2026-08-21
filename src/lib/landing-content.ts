// Copy shown on the landing page. FAQS is also the source for the FAQPage
// JSON-LD on the homepage, so what visitors read and what answer engines
// quote can never drift apart.


export const RED_FLAGS: { who: 'he' | 'she'; text: string }[] = [
  { who: 'he', text: "You can work after marriage. From home. Part-time. If there's time after cooking." },
  { who: 'she', text: "I need a 3BHK minimum. Your parents can visit — not live." },
  { who: 'he', text: "What's your salary? Just asking so we know how much you'll contribute to the wedding." },
  { who: 'she', text: "What car do you drive? No reason. Just checking compatibility." },
  { who: 'he', text: "You'll obviously delete public Instagram after the roka, right?" },
  { who: 'she', text: "Can you get your promotion confirmed before the roka? Papa is asking." },
  { who: 'he', text: "I don't have anger issues. People just keep making me angry." },
  { who: 'she', text: "My last rishta broke because he wouldn't stop talking to his sister. Weird, na?" },
  { who: 'he', text: "I don't believe in sharing household work. That's why we'll have a maid. For you to manage." },
  { who: 'she', text: "I want a simple wedding. 800 guests, max." },
  { who: 'he', text: "I'm okay with a working wife. As long as dinner is hot by 8." },
  { who: 'she', text: "My father will call your office to verify your package. Don't take it personally." },
];

export const TICKER_1 = [
  'AI biodata scanner', '36-guna kundli milan', '5-step rishta journey',
  'Red flag log', 'Decision matrix', 'Family scorecard', 'Call journal', 'Private by default',
];
export const TICKER_2 = [
  '"Beta, koi mila?"', '"Sharma ji ka ladka"', '"Haan mummy, dekh liya"',
  '"Pandit ji says shubh"', '"Woh Bengaluru wala?"', '"Bas ek aur biodata"',
];

export const CHAOS_CARDS: {
  cls: string; tag: string; text: string;
  pos: React.CSSProperties; rot: number; dur: number; delay: number;
}[] = [
  { cls: 'lp-chaos-wa', tag: 'WhatsApp · Bua ji', text: '📄 Rishabh_FINAL_biodata_v3 (2).pdf', pos: { top: 0, left: '2%' }, rot: -3, dur: 7, delay: 0 },
  { cls: 'lp-chaos-wa', tag: 'WhatsApp · Mummy', text: 'Beta, call his mother today only. They are waiting 🙏', pos: { top: '10%', right: '4%' }, rot: 2.5, dur: 8, delay: 0.8 },
  { cls: 'lp-chaos-note', tag: 'Sticky note · You', text: 'Samarth?? Sumanth?? — the Bengaluru one 🤔', pos: { top: '38%', left: '18%' }, rot: -1.5, dur: 6.5, delay: 1.6 },
  { cls: 'lp-chaos-wa', tag: 'WhatsApp · Pandit ji', text: '🖼️ kundli_photo_blurry_final.jpg', pos: { top: '46%', right: '16%' }, rot: 3.5, dur: 7.5, delay: 0.4 },
  { cls: 'lp-chaos-flag', tag: 'Screenshot · ??', text: '"I don\'t have anger issues. People make me angry." — wait, WHO said this one?!', pos: { bottom: '4%', left: '6%' }, rot: 2, dur: 8.5, delay: 1.2 },
  { cls: 'lp-chaos-note', tag: 'Calendar · Doom', text: 'Sunday 4 p.m. — family Zoom. Prepare answers.', pos: { bottom: 0, right: '6%' }, rot: -2.5, dur: 7, delay: 2 },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is this like a matrimonial app?',
    a: "No. RokaMaybe doesn't show you new matches or connect you with other users. It's a personal tracker for the prospects you're already meeting — whether they come from matrimonial sites, pandits, relatives, or family friends. Think of it as your private dashboard for your own search.",
  },
  {
    q: 'Do I need to download an app?',
    a: "Nope. RokaMaybe runs in your browser — phone or laptop, doesn't matter.",
  },
  {
    q: 'How does the biodata AI thing work?',
    a: 'You upload a biodata PDF, Word doc, or photo. AI reads it and fills in the form — name, age, family details, kundli info, all of it. Saves you a lot of typing. You can review and edit anything before saving.',
  },
  {
    q: 'Is the kundli matching reliable?',
    a: "The calculations are based on real Vedic astronomy — we compute the Moon's position from the birth details and run the full 36-point Ashtakoot. It's accurate for reference. That said, astrology is a deep subject and we always recommend consulting a qualified pandit before making any final decisions.",
  },
  {
    q: 'Is my data actually safe?',
    a: "Yes. Your data lives on secure encrypted servers, and only you can see it. We don't share profiles between users, we don't sell data, and we don't show your information to anyone. You can delete your account and all your data any time you want.",
  },
  {
    q: 'Who built this?',
    a: 'Me — Komal. I built RokaMaybe because I was going through my own rishta search and couldn\'t find anything that actually helped. If you have feedback or run into issues, email me directly: namaste@rokamaybe.com',
  },
];
