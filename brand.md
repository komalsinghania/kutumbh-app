Apply the official RokaMaybe brand guidelines to the entire app. This is a COMPLETE visual rebrand. Replace ALL current colors, fonts, logo treatments, and design tokens.

===========================================
BRAND COLORS (replace ALL existing colors)
===========================================

CSS Variables to define globally in your Tailwind config or globals.css:

--ink: #1a1410          (primary text, dark backgrounds)
--ink-soft: #2d241c     (secondary dark)
--paper: #f5ede0        (main background — replaces current #F9F6F0)
--paper-bright: #faf4e8 (card backgrounds, lighter areas)
--cream: #ebe0cc        (subtle backgrounds, alternating rows)
--sindoor: #c13e2a      (PRIMARY BRAND COLOR — replaces coral #C17858 AND old henna #A0522D)
--sindoor-dark: #8f2a1b (hover states, pressed states)
--sindoor-deep: #6b1e12 (deep accents)
--gold: #b8892b         (secondary accent — replaces old #C4A265)
--gold-light: #d4a94a   (highlights, active states)
--gold-soft: #e8c870    (subtle gold accents)
--muted: #6b5e4d        (muted text — replaces old #6A5D4E)
--line: #d6c9b0         (borders, dividers — replaces old #E8E0D2)
--success: #2d6b4f      (keep same)
--danger: #8b1a2b       (keep same)

REPLACE EVERYWHERE:
- Old henna #A0522D → sindoor #c13e2a
- Old coral #C17858 → sindoor #c13e2a  
- Old gold #C4A265 → gold #b8892b
- Old parchment #F9F6F0 → paper #f5ede0
- Old card white → paper-bright #faf4e8
- Old dark header #241C14 → ink #1a1410
- Old border #E8E0D2 → line #d6c9b0
- Old muted text → muted #6b5e4d

===========================================
FONTS (replace ALL existing fonts)
===========================================

Remove Playfair Display entirely. Install these new fonts:

@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,500;1,9..144,700&family=Instrument+Serif:ital@0;1&display=swap');

Usage:
- LOGO/WORDMARK: 'Fraunces', serif — weight 500 for "Roka", weight 400 italic for "Maybe"
- HEADINGS (h1, h2, section titles): 'Instrument Serif', serif — regular or italic
- BODY TEXT: 'Fraunces', serif — weight 400 (yes, serif for body too — this is the brand)
- LABELS/CAPTIONS: System font or 'Fraunces' at smaller sizes
- MONOSPACE (for labels like section numbers, tags): Use system monospace or keep JetBrains Mono if already available

Replace ALL instances of:
- 'Playfair Display' → 'Fraunces' for wordmark/logo, 'Instrument Serif' for headings
- 'Georgia' fallback → keep as fallback for both
- System font stack for body → 'Fraunces', Georgia, serif

===========================================
LOGO TREATMENT (update everywhere)
===========================================

The logo is the wordmark "RokaMaybe" rendered as:
- "Roka" in Fraunces, weight 500, color: --ink (on light bg) or --paper (on dark bg)
- "Maybe" in Fraunces, weight 400, ITALIC, color: --sindoor (on light bg) or --gold (on dark bg)
- Letter-spacing: -0.035em
- Font-variation-settings: "opsz" 144

On dark backgrounds (header):
- "Roka" in --paper (#f5ede0)
- "Maybe" in --gold (#b8892b) italic

On sindoor backgrounds:
- "Roka" in --paper (#f5ede0)
- "Maybe" in --gold-soft (#e8c870) italic

Update the logo in:
- Dashboard header (top left)
- Landing page
- Onboarding screens
- Login page
- Empty states
- Any other place it appears

===========================================
APP ICON / FAVICON
===========================================

The app icon is:
- Background: sindoor (#c13e2a)
- Border radius: 22% (iOS style)
- Text: "R" in Fraunces weight 500, color paper (#f5ede0)
- "m" in Fraunces weight 400 italic, color gold-soft (#e8c870)
- Combined: "Rm" monogram

Create the favicon as an SVG or inline in the HTML head:
- 16px, 32px versions
- Background: sindoor, text: Rm in paper/gold

Update:
- public/favicon.ico or use SVG favicon in layout.tsx
- Apple touch icon if exists
- Any loading/splash screen references

===========================================
EMPTY STATE (the K monogram on dashboard)
===========================================

Replace the old "K" monogram circle with the new "Rm" monogram:
- Circle with sindoor background (#c13e2a), border-radius 50%
- "Rm" text inside: "R" in Fraunces 500 paper color, "m" in Fraunces 400 italic gold-soft
- Or just use the app icon style (rounded square with Rm)

===========================================
HEADER / NAVBAR
===========================================

- Background: --ink (#1a1410) solid (not gradient)
- Logo left: "Roka" in --paper, "Maybe" in --gold italic (Fraunces)
- User avatar right: Keep circle with initials or photo
- Bottom border: 1px solid rgba(214, 201, 176, 0.15) (--line with low opacity)
- Height: 52px

===========================================
BUTTONS
===========================================

Primary button (CTA, Save, Continue):
- Background: --sindoor (#c13e2a)
- Hover: --sindoor-dark (#8f2a1b)
- Text: --paper (#f5ede0)
- Border-radius: 8px
- Font: Fraunces, weight 500
- No gradient — flat sindoor color

Secondary button (Back, Cancel, Skip):
- Background: transparent
- Border: 1px solid --line
- Text: --ink
- Hover: background --cream

Floating Action Button (+):
- Background: --sindoor (#c13e2a)
- Text: --paper white
- Shadow: 0 6px 24px rgba(193, 62, 42, 0.35)

===========================================
PILLS / CHIPS
===========================================

Unselected:
- Background: --paper-bright
- Border: 1px solid --line
- Text: --muted
- Border-radius: full (rounded)

Selected:
- Background: --sindoor (#c13e2a)
- Border: 1px solid --sindoor
- Text: --paper (#f5ede0)

For non-negotiable selected pills (dealbreakers):
- Background: --danger (#8b1a2b) — wine red
- Text: --paper

===========================================
CARDS
===========================================

- Background: --paper-bright (#faf4e8)
- Border: 1px solid --line (#d6c9b0)
- Border-radius: 8px (not 12px or 16px — more restrained)
- Shadow: 0 1px 4px rgba(0,0,0,0.03) — very subtle
- Hover: border-color transitions to --gold

===========================================
STAR RATINGS
===========================================

- Filled: --gold (#b8892b)
- Empty: --line (#d6c9b0)

===========================================
SECTION LABELS
===========================================

Section headers (like "PHOTOS", "DETAILS", "KUNDLI MILAN"):
- Font: System monospace or Fraunces
- Size: 10px
- Letter-spacing: 0.2em
- Text-transform: uppercase
- Color: --sindoor (#c13e2a)

===========================================
SCORE BADGES
===========================================

- High scores (70%+): --success green
- Medium scores (40-69%): --gold
- Low scores (<40%): --danger
- Kundli scores: --gold color always

===========================================
STAGE COLORS
===========================================

Keep the existing stage colors but ensure they work with the new paper background. The stage pills should be subtle — light tinted backgrounds with darker text of the same hue.

===========================================
BOTTOM TAB BAR
===========================================

- Background: --paper-bright (#faf4e8)
- Border-top: 1px solid --line
- Active tab icon + text: --sindoor (#c13e2a)
- Inactive tab: --muted

===========================================
VOICE & TONE (update app copy)
===========================================

The brand voice is: observed, specific, culturally native, honest, pro-agency.

Update these strings in the app:
- Empty board: "Begin your journey" → "No prospects yet. Add your first."
- Stage labels should be plain: "New Lead", "Photos Shared", "Call Done" (not fancy)
- Tagline on login: "Before every roka, there's a year of maybes."
- Loading states: Keep simple, no cutesy language

===========================================
LANDING PAGE
===========================================

If a landing page exists, update it with:
- Hero: Large "Roka" + "Maybe" in Instrument Serif, massive (clamp 72px to 180px)
- "Maybe" in sindoor italic
- Tagline: "Before every roka, there's a year of maybes." in Instrument Serif italic
- Background: --paper
- Accent glow: Subtle radial gradient of sindoor at 8% opacity

===========================================
IMPORTANT
===========================================

1. Replace EVERY color, EVERY font reference across ALL files
2. Search for "Playfair" and replace with Fraunces/Instrument Serif
3. Search for all hex colors (#A0522D, #C17858, #C4A265, #F9F6F0, #241C14, #1C1612, #E8E0D2) and replace with new brand colors
4. The overall feel should be: warm, papery, sindoor-red accented, serif-heavy, Indian but modern
5. Build must pass with zero errors
6. Test on mobile (375px)

Deploy with npx vercel --prod
