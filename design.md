Completely redesign the UI/UX of the RokaMaybe app with a PREMIUM LUXURY WEDDING INVITATION aesthetic. The app should feel like opening an expensive wedding card — elegant, rich, and sophisticated. This is a visual overhaul of every screen. Do NOT change any functionality, just the design.

===========================================
DESIGN SYSTEM
===========================================

COLOR PALETTE:
- Primary Background: #FBF8F3 (warm ivory)
- Card Background: #FFFFFF with subtle shadow
- Header/Hero: Deep gradient from #2C1810 (rich chocolate) to #5C2E1E (deep mahogany)
- Primary Accent: #8B6914 (antique gold)
- Secondary Accent: #C9A84C (champagne gold)
- Text Primary: #1A1412 (near black with warmth)
- Text Secondary: #6B5D52 (warm grey)
- Text Muted: #A69888
- Success/Green: #2D6B4F
- Warning/Yellow: #B8860B
- Danger/Red: #8B1A2B (deep wine red, not bright)
- Border: #E8DFD3 (warm sand)
- Hover/Active: rgba(139,105,20,0.08) (gold tint)

TYPOGRAPHY:
- Logo: Use a decorative serif — "Playfair Display" for RokaMaybe
- Headings: "Cormorant Garamond" (already installed) — italic for section titles
- Body: "Nunito Sans" (already installed)
- Scores/Numbers: "Cormorant Garamond" bold

SPACING & LAYOUT:
- Max content width: 800px centered on desktop
- Card border-radius: 16px
- Button border-radius: 12px
- Pill/chip border-radius: 24px
- Generous padding everywhere — 24px card padding, 20px section gaps
- Cards should have: border: 1px solid #E8DFD3, box-shadow: 0 2px 12px rgba(0,0,0,0.04)

===========================================
GLOBAL ELEMENTS
===========================================

HEADER/NAVBAR:
- Sticky top bar with deep gradient background (#2C1810 → #3D2417)
- Logo RokaMaybe in Playfair Display, champagne gold color, left side
- User name + circular avatar on right
- Subtle gold bottom border (1px solid rgba(201,168,76,0.3))
- Height: 64px

BUTTONS:
- Primary: Deep gold gradient (linear-gradient(135deg, #8B6914, #C9A84C)) with white text, subtle shadow
- Secondary: White background, gold border, gold text
- Danger: Deep wine red (#8B1A2B)
- All buttons: font-weight 600, letter-spacing 0.3px, padding 14px 28px
- Hover: Slight scale(1.02) with transition

CARDS:
- White background, warm border, soft shadow
- On hover: shadow increases, very subtle gold border tint
- Transition: all 0.2s ease

PILLS/CHIPS:
- Unselected: White bg, warm border, muted text
- Selected: Gold gradient background, white text
- Stage pills use their own colors but with refined, muted tones (not bright)

STAR RATINGS:
- Empty stars: #D4C9BC (warm grey)
- Filled stars: #C9A84C (champagne gold)
- Size: 20px each

SECTION HEADERS:
- Use small caps, letter-spacing: 2px, gold color (#8B6914)
- Optional: thin gold line underneath (1px, 40px wide)

===========================================
SCREEN 1: DASHBOARD
===========================================

HERO SECTION (replaces current flat header):
- Full width gradient background (#2C1810 → #3D2417 → #5C2E1E)
- RokaMaybe logo large, centered, in champagne gold
- "Namaste, Komal" below in light ivory, italic Cormorant
- 3 stat cards in a row, overlapping the hero bottom by 30px:
  - Glass-morphism style: white bg with rgba(255,255,255,0.9), backdrop-blur, gold border
  - Numbers in large Cormorant bold, gold color
  - Labels in small Nunito, muted text
  - Cards have subtle gold top border (3px)

PIPELINE SECTION:
- Clean horizontal row of stage badges
- Each badge: pill shape, subtle background tint of stage color, small dot indicator
- No "PIPELINE" label — self-evident

FILTER & SORT:
- Filter pills in a single scrollable row
- Active filter: gold background, white text
- Sort buttons: smaller, text-style buttons below filters
- Active sort: bold with gold underline

PROSPECT CARDS:
- Photo: 56px circular, gold border (2px solid #C9A84C)
- Name: Cormorant Garamond, 18px, semibold
- Details (age, city, profession): Nunito Sans, 13px, muted
- Score: Large Cormorant bold in gold circle/badge on right
- Stage pill: Rounded, muted stage color
- Source pill: Light grey with icon
- Bottom row: green/red flag dots, family stars, conversation count, last activity — all very small, muted, information-dense
- Card hover: Lift effect with increased shadow
- Gold left border accent (3px) for "Mutually Interested" stage

FLOATING ADD BUTTON:
- Gold gradient, white + icon
- Subtle gold glow shadow
- Size: 56px circle

===========================================
SCREEN 2: PROSPECT DETAIL
===========================================

HERO:
- Same deep gradient as dashboard header
- Prospect photo: 80px, gold border, centered or left-aligned
- Name in Cormorant, large, ivory color
- Age, city, source in light text below
- 3 score cards (Overall, Kundli, Compatibility) as glass cards overlapping hero

TABS:
- Horizontal tab bar: Overview, Calls, Flags, Family, Meeting (if applicable)
- Active tab: Gold underline (3px), bold text
- Inactive: Muted text
- Tab bar has subtle bottom border

OVERVIEW TAB:
- Photos section: Horizontal scroll, images in rounded rectangles (12px radius) with subtle shadow
- Stage selector: Horizontal scroll of stage pills, selected one filled with stage color, others outlined
- Details table: Alternating very subtle row backgrounds (#FBF8F3 and white), gold labels on left
- Kundli Milan section: Beautiful scorecard with 8 rows, each showing koot name, icon, progress bar (gold fill), score. Summary card at top with large score in gold circle
- Notes section: Clean timeline with date badges, subtle left border line in gold

CALLS TAB:
- Log form in a clean card
- Pill selectors: Gold-outlined when unselected, gold-filled when selected
- Topic chips: Rounded, warm border, selected ones get subtle gold background
- Mood emojis: In circular containers, selected one gets gold ring
- Conversation timeline below: Cards with date header, topic pills, mood emoji, notes

FLAGS TAB:
- Green section: Soft green-tinted card (#F0FAF4), green header
- Red section: Soft wine-tinted card (#FAF0F0), wine-red header
- Flag chips: Green ones in green-outlined pills, red ones in wine-outlined pills
- Selected flags: Filled with respective color
- Added flags history: Timeline below with green/red dots, date, flag text

FAMILY TAB:
- Star ratings: Gold stars, clean layout
- Each dimension in its own row with label left, stars right
- Low/high labels in small muted text
- Overall score: Large gold stars at top
- Save button: Gold gradient

===========================================
SCREEN 3: ADD PROSPECT
===========================================

- Clean white background
- Section headers: Small caps, gold, with thin line
- Input fields: Tall (48px), rounded (12px), warm border, focus state = gold border
- Pill selectors: Gold theme
- Upload area (if present): Dashed gold border, gold icon, "Upload Biodata" text
- Source selection: Full-width buttons with icons, gold highlight on selected
- Save button: Full-width, gold gradient, sticky bottom

===========================================  
SCREEN 4: COMPARE / DECISION MATRIX
===========================================

- Header: "Help Me Decide" in elegant Cormorant italic
- Table: Clean, alternating row colors, gold headers
- Winner cells: Subtle gold background tint with ★
- Summary section: Gold-bordered card at bottom with recommendation text

===========================================
SCREEN 5: ACTIVITY TIMELINE
===========================================

- Vertical timeline with thin gold line on left
- Each entry: Small gold dot on timeline, card extending right
- Date headers in small caps gold
- Activity text with prospect name highlighted (tappable)
- Filter pills at top in gold theme

===========================================
SCREEN 6: LOGIN PAGE
===========================================

- Full screen with background: subtle mandala/paisley pattern in very light gold on ivory
- Center card: White, large border-radius (24px), generous padding
- RokaMaybe logo large at top, gold color
- Tagline: "Your matrimonial journey, elegantly organized" in Cormorant italic
- Google Sign-In button: White with Google colors, rounded, shadow
- Email/password fields below
- Bottom: Subtle gold decorative border element

===========================================
SCREEN 7: ONBOARDING
===========================================

- Progress bar: Thin gold line filling left to right
- Step counter: Gold text, top right
- Section badge: Gold background pill with section name
- Question: Large Cormorant serif, dark text
- Pill options: Gold-outlined, gold-filled when selected
- Nakshatra grid: Small gold-outlined pills, selected = gold fill
- Non-negotiable pills: Wine red when selected (keep current behavior but refine)
- Continue button: Gold gradient, full width at bottom
- Back button: Outlined, refined

===========================================
ANIMATIONS & MICRO-INTERACTIONS
===========================================

- Page transitions: Fade in + slight slide up (200ms)
- Card appear: Staggered slide up animation on dashboard load
- Tab switch: Content fade transition (150ms)
- Button press: Subtle scale down (0.98) on press, back to 1 on release
- Score numbers: Count-up animation when first visible
- Star rating: Stars fill with a slight delay between each (50ms stagger)
- Stage change: Pill slides into new color with transition
- Adding a flag: Chip bounces slightly when added
- Toast notifications: Slide in from top with gold accent border

===========================================
MOBILE OPTIMIZATIONS
===========================================

- All touch targets minimum 44px
- Cards: Full width with 16px horizontal margin
- Bottom safe area padding for phones with gesture bars
- Swipe gestures on prospect cards (swipe left to compare, swipe right to open)
- Pull to refresh on dashboard
- Sticky bottom action buttons with frosted glass effect

===========================================
LOADING STATES
===========================================

- Skeleton screens: Gold-tinted shimmer animation on placeholder cards
- Spinner: Thin gold ring spinning
- Button loading: Text replaced with small gold spinner

===========================================
IMPORTANT RULES
===========================================

1. Do NOT change any functionality — only visual design
2. Keep all existing components working — just restyle them
3. Use Tailwind CSS classes for everything
4. Maintain mobile-first responsive design
5. Test that the build passes with zero errors after changes
6. The overall feel should be: "This is an app made for someone getting married into a good family" — premium, trustworthy, elegant
