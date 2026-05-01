Implement ALL of these UI/UX improvements across the entire RokaMaybe app. This is a comprehensive overhaul based on a professional design audit.

===========================================
1. HEADER & ANNOUNCEMENT BAR FIX
===========================================

A) Announcement banner:
- Reduce height — single compact line, 12-14px font size, max 36px total height
- Make it dismissable — add X button, remember dismissal in localStorage so it doesn't come back
- Keep sindoor (#c13e2a) background, white text

B) Header CTAs — differentiate them:
- "Sign In" → ghost/text button: transparent background, white text, no border. Subtle, secondary.
- "Start Free" → filled primary button: white background, sindoor text, bold. This is THE action.
- NOT both outlined the same way

C) Header shrink on scroll:
- On scroll down, reduce header padding slightly and add a subtle shadow
- Total header + banner should never exceed 100px combined

===========================================
2. HERO SECTION FIX
===========================================

A) Logo size — CRITICAL FIX:
- Desktop: max font-size 100px (use clamp(48px, 8vw, 100px))
- Mobile: max font-size 48px
- Must NOT overflow horizontally. Add overflow-x: hidden
- Center properly with equal margins

B) Add product screenshot/mockup:
- Below the tagline, add a browser mockup frame showing the dashboard
- Use a simple CSS browser chrome (grey bar with 3 dots) containing a screenshot of the actual dashboard
- This is the SINGLE highest impact change — users need to SEE what they're getting
- If you can't take a real screenshot, create a simplified illustration of the dashboard with placeholder cards

C) Trim the hero text:
- Keep: "Before every roka, there's a year of maybes."
- The long paragraph below should be max 2 lines on desktop
- Move detailed explanation to the features section

D) Single primary CTA in hero:
- One big button: "Start Free — No credit card needed" in white bg with sindoor text
- Below it, smaller text: "Takes 2 minutes to set up"

===========================================
3. FEATURE CARDS OVERHAUL
===========================================

A) Replace emoji icons with consistent SVG icons:
- Replace 📄 ⭐ 🎯 📞 and all emoji with simple line SVG icons
- Use sindoor color (#c13e2a) for icons, 32px size
- Icons should be: Upload/Document icon, Star/Sparkle icon, Target icon, Phone icon, Flag icon, Grid/Compare icon
- Simple inline SVGs — no external library needed

B) Add alternating section backgrounds:
- Section 1 (Hero): paper (#f5ede0) 
- Section 2 (Features): white (#ffffff)
- Section 3 (How it works): paper (#f5ede0)
- Section 4 (Pricing): white (#ffffff)
- Section 5 (Testimonials/Red flags): paper-bright (#faf4e8)
- Section 6 (FAQ): white (#ffffff)
- Section 7 (For Parents/Letter): paper (#f5ede0)
- Footer: sindoor (#c13e2a)
This creates visual rhythm — no more "one long essay" feeling.

C) Feature card styling:
- White background cards on non-white sections, cream cards on white sections
- Subtle border: 1px solid #d6c9b0
- Border-radius: 8px
- Padding: 32px
- Hover: subtle lift with shadow increase

===========================================
4. TYPOGRAPHY HIERARCHY
===========================================

A) Introduce a sans-serif for body copy:
- Add Inter or DM Sans for body text, labels, descriptions
- @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

- Headings: Keep Fraunces / Instrument Serif (serif)
- Body text, descriptions, feature explanations: DM Sans (sans-serif)
- UI labels, buttons, pills: DM Sans
- Logo wordmark: Fraunces (keep as is)
- Editorial moments (tagline, "Dear Mummy" letter): Instrument Serif italic

This mix makes it feel like a modern SaaS product while keeping the editorial character.

B) Text size hierarchy:
- H1 (hero): clamp(48px, 8vw, 100px) Fraunces
- H2 (section titles): 36-42px Instrument Serif
- H3 (card titles): 20-24px Fraunces
- Body: 16px DM Sans
- Small/caption: 13px DM Sans
- Labels: 11px DM Sans, uppercase, letter-spacing 0.1em

===========================================
5. PRICING SECTION
===========================================

A) Premium card treatment:
- Add subtle elevation/shadow to the Premium card
- Add a small "POPULAR" or "RECOMMENDED" badge at top
- Slightly larger than the Free card
- Sindoor border on left or top (3px)

B) Scarcity indicator:
- Add "X of 50 seats claimed" with a progress bar below the price
- Or a countdown timer for the launch offer

C) Clear Free vs Premium comparison:
- Checkmarks in sindoor for included features
- Grey X marks for excluded
- Make the upgrade benefit crystal clear

===========================================
6. FAQ SECTION
===========================================

A) Styled accordion:
- Card backgrounds for each question (paper-bright)
- Smooth expand/collapse animation (max-height transition)
- Group questions by theme with small category labels:
  - PRODUCT (How does it work, What can I track)
  - PRIVACY (Is my data safe, Who can see)
  - BILLING (Free vs Premium, Refunds)
  - FOR PARENTS (Mummy Mode, Family access)

B) Expand icon: Rotate animation on the + sign when opening

===========================================
7. TESTIMONIALS / RED FLAGS SECTION
===========================================

A) Give red flag quotes more visual weight:
- Larger cards with slight rotation (transform: rotate(-1deg) to rotate(2deg))
- Hand-drawn style quotation marks in gold accent
- Varying card sizes for visual interest
- "Shared with permission" label in small muted text

B) Add a subtle pinboard/scrapbook feel — slight shadows, overlapping edges

===========================================
8. TRUST & PRIVACY SECTION
===========================================

Add a dedicated privacy/trust section with scannable icon+text pairs:
- 🔒 "End-to-end private — only you see your data"
- 🚫 "No ads, ever"
- 📤 "Export your data anytime"
- 🗑️ "Delete everything in one click"
- 🇮🇳 "Made in India, data stored in India"

Use simple line SVG icons (not emoji) in sindoor color. 4-5 items in a horizontal row on desktop, vertical on mobile.

===========================================
9. FOOTER ENHANCEMENTS
===========================================

- Keep sindoor background
- Add Komal's name/title more prominently: "Built by Komal Singhania"
- Add social links with icons (Instagram, LinkedIn, Twitter)
- Group links: Product | Legal | Connect
- Add "Made with ❤️ in India" (keep the heart, it's endearing)

===========================================
10. MOBILE OPTIMIZATIONS
===========================================

- Hero must fit in one mobile viewport (no scrolling to see CTA)
- Banner dismissable and compact
- Feature cards: single column, full width
- Pricing cards: stacked vertically
- Touch targets: minimum 44px
- Bottom padding on all scrollable content

===========================================
11. PRODUCT DEMO / SCREENSHOTS
===========================================

Since we can't embed real screenshots easily, create a CSS mockup:
- A div styled like a browser window (rounded corners, grey top bar with 3 colored dots)
- Inside it, show a simplified representation of the dashboard:
  - Header bar with "RokaMaybe" logo
  - 3 stat cards (7 Prospects, 5 Active, 62% Match)
  - 2-3 prospect cards with names, scores, stage pills
- Use actual app colors and fonts
- This gives users a visual preview of what they'll get

Place this in the hero section below the tagline, or as the first thing in the "How it works" section.

===========================================
12. CONVERSION IMPROVEMENTS  
===========================================

A) "How it works" section — reword step 2:
- Current: "16 quick questions about what you're looking for"
- New: "Quick preference setup (2 minutes)" with a preview of pill selections

B) "Mummy Mode" teaser:
- Add email capture: "Get notified when Mummy Mode launches"
- Simple email input + "Notify Me" button

C) After "Start Free" CTA, add reassurance text:
- "No credit card required · Set up in 2 minutes · Cancel anytime"

===========================================
IMPORTANT RULES
===========================================

1. Apply ALL changes to the landing page
2. The dashboard and internal app pages should also get the DM Sans body font
3. Keep all functionality — only change visual presentation
4. Alternating backgrounds are critical for visual rhythm
5. Product mockup in hero is the highest priority change
6. Build must pass with zero errors
7. Deploy with npx vercel --prod
