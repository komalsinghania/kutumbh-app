Completely redesign the RokaMaybe app navigation, layout, and visual design. This is a MAJOR overhaul. The current UI has clutter — duplicate filters, confusing navigation, too many buttons doing similar things. Replace it with a clean, intuitive architecture inspired by Taj Hotels luxury aesthetic (Concept 2 — The Suite style).

===========================================
DESIGN THEME: THE SUITE (Concept 2)
===========================================

COLOR PALETTE:
- Header background: linear-gradient(170deg, #241C14, #1C1612)
- Body background: #F9F6F0 (warm parchment)
- Card background: #FFFFFF
- Gold accent: #C4A265 (muted antique gold, NOT bright yellow)
- Text primary: #1C1612
- Text secondary: #6A5D4E
- Text muted: #9A8A75
- Green (active/positive): #2D6B4F
- Red (closed/negative): #8B2A2A
- Border: #E8E0D2
- Card shadow: 0 1px 8px rgba(0,0,0,0.04)

TYPOGRAPHY:
- Logo and headings: 'Playfair Display', Georgia, serif
- Body text: System font stack (-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)
- Hindi RokaMaybe: Shown small beside the English name, same serif font
- NO Cormorant Garamond, NO Nunito Sans — replace everywhere

Import: @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');

LOGO in header (left-aligned, not centered):
- "RokaMaybe" in Playfair Display 20px
- "RokaMaybe" in 10px beside it, gold color, slightly faded
- User name on the right side

===========================================
NEW NAVIGATION ARCHITECTURE
===========================================

REMOVE all of these from dashboard:
- Pipeline badges row (duplicate of filter)
- "Tap cards to select up to 3 for comparison" text
- Sort buttons (Best Match, Kundli, Newest, A→Z)
- Filter pills (All, New Lead, etc.)
- The compare mode on dashboard

REPLACE WITH: Bottom Tab Bar navigation (4 tabs):

Tab 1: BOARD (default, home icon)
- Swipeable horizontal stage tabs at the top
- Each stage tab shows prospects in that stage
- Swipe left/right between stages
- Stage tabs: New Lead | Photos | Kundli | Calls | Family | Meeting | Met | Interested | On Hold | Closed
- Only show tabs that have prospects (hide empty stages)
- Each tab shows count: "New Lead (4)"
- Prospect cards within each stage are sorted by newest first

Tab 2: MATCHES (heart icon)
- Two sub-tabs: "By Compatibility" and "By Kundli"
- "By Compatibility": All prospects sorted by compatibility % descending, with match breakdown expandable
- "By Kundli": All prospects sorted by guna score, only shows those with kundli data, with ashtakoot breakdown expandable
- This is where scoring analysis lives — clean, no clutter

Tab 3: TIMELINE (clock icon)  
- Activity feed (already built)
- Clean chronological list

Tab 4: PROFILE (user icon)
- Your profile details
- Edit preferences
- App settings
- Logout

BOTTOM TAB BAR STYLE:
- Background: #FFFFFF
- Border top: 0.5px solid #E8E0D2
- Height: 56px + safe area
- Active tab: Gold icon + gold text
- Inactive tab: Muted grey icon + text
- Icons: Simple line icons (use text/unicode, no external library needed)

===========================================
PROSPECT CARDS — REDESIGNED
===========================================

Each prospect card should be clean and information-dense without clutter:

Layout:
- Left: Profile photo (48px circle, if no photo show initials on gold-tinted background)
- Center: Name (Playfair Display 16px, dark), below: age · city · profession (system font 12px, muted)
- Right: Score circle (overall % in gold)

Below the main row:
- Stage progress indicator: A thin horizontal bar showing 0-100% of the journey (based on current stage position out of 11). Gold fill. Very subtle.
- Small metadata row: Source pill (e.g., "Jeevansathi"), green flag count (green dot + number), red flag count (red dot + number), family score stars (if rated)

Card actions:
- Tap card → opens prospect detail
- Swipe card right → shows "Move to next stage" action
- Long press → shows options: Compare, Edit, Delete

Card style:
- White background, border-radius 12px
- Border: 0.5px solid #E8E0D2
- Shadow: 0 1px 8px rgba(0,0,0,0.04)
- Padding: 16px
- Margin bottom: 10px
- Hover/active: Subtle gold border tint

===========================================
PROSPECT DETAIL PAGE — REDESIGNED
===========================================

HERO (dark header, same gradient):
- Back arrow (left)
- Prospect name (Playfair Display, large, cream)
- Age · City · Source below
- Three score cards: Overall, Kundli, Compatibility (glass-style, overlapping into light section)

STAGE PROGRESS BAR:
- Replace the horizontal scrolling stage pills with a visual journey tracker
- Like a delivery tracking bar: dots connected by a line
- Completed stages: Gold filled dots with checkmark
- Current stage: Larger gold pulsing dot
- Future stages: Grey outlined dots
- Tapping the next dot triggers stage change + prompt

TABS (horizontal, clean):
- Overview | Calls | Flags | Family | Meeting | Kundli
- Active tab: Bold text + gold underline
- "Kundli" tab only visible if birth details exist

OVERVIEW TAB:
- Photos (horizontal scroll)
- Details table (alternating subtle row backgrounds)
- Notes section

All other tabs remain the same functionally but restyled to match The Suite theme.

===========================================
ADD PROSPECT — REDESIGNED
===========================================

- "+" button: Gold circle, bottom right, 54px
- Opens a clean form page
- Upload button at top: "Upload Biodata" with gold outline
- Form sections with gold section headers
- Source selection: Full-width tappable cards with icon, not small pills
- Stage defaults to "New Lead"
- Save button: Full-width gold button, sticky bottom

===========================================
COMPARE PAGE — REDESIGNED  
===========================================

Access: From Matches tab, tap "Compare" button at top → select 2-3 prospects → see side-by-side
NOT from the main board. Compare is an analytical action, it belongs in Matches.

===========================================
HEADER — ALL PAGES
===========================================

Sticky header on all pages:
- Height: 56px
- Background: linear-gradient(170deg, #241C14, #1C1612)
- Left: "RokaMaybe RokaMaybe" logo (Playfair Display)
- Right: User initials circle or profile photo
- Subtle gold bottom border (1px, 0.15 opacity)

On detail pages:
- Left: Back arrow
- Center: Prospect name
- Right: Edit/Delete

===========================================
ANIMATIONS & TRANSITIONS
===========================================

- Page transitions: Slide left/right for tab switches
- Card appear: Stagger fade-in (50ms between cards)
- Stage progress: Smooth fill animation when stage changes
- Tab switch content: Crossfade (150ms)
- Button press: scale(0.98) feedback
- Swipe stage tabs: Native scroll-snap with momentum

===========================================
MOBILE FIRST
===========================================

- All touch targets: minimum 44px
- Bottom tab bar with safe area padding
- Cards: Full width with 16px horizontal padding
- No horizontal scrolling on cards
- Stage tabs: Horizontal scroll with scroll-snap
- Pull to refresh on board

===========================================
IMPORTANT
===========================================

1. Replace ALL existing navigation and layout code
2. Keep all functionality — just restructure WHERE it lives
3. Test on mobile viewport (375px width)
4. The current Playfair Display font import may exist — keep it, remove Cormorant and Nunito imports
5. Build passes with zero TypeScript errors
6. The overall feel: Walking into a Taj Hotel lobby — you know it is expensive without being told. Nothing screams, everything whispers quality.
