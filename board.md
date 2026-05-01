Redesign the Board tab (dashboard home screen) to be visually rich, interactive, and engaging. Keep the same data and functionality but transform the presentation. Use the Taj Hotel luxury aesthetic (dark header, warm parchment body, Playfair Display headings, muted gold accents).

===========================================
SECTION 1: HEADER (already exists, keep it)
===========================================
Keep: "RokaMaybe RokaMaybe" left, "Komal KS" right, dark gradient background.

===========================================
SECTION 2: JOURNEY SNAPSHOT (NEW — replaces plain stat cards)
===========================================

Add a beautiful visual summary section right below the header. This is the hero of the board.

Create a horizontal journey visualization:
- A curved or straight path/line going left to right
- Dots on the path representing stages
- Each dot sized proportionally to how many prospects are in that stage
- Gold filled dots for stages with prospects, grey outlines for empty stages
- Small number badge on each dot showing count
- Below the path, show the stage names

Example visual flow:
[New Lead: 4] ——→ [Kundli: 1] ——→ [Met: 1] ——→ [Interested: 0]

Below the journey path, show 3 key metrics in elegant cards:
- Total Prospects (number + "across X stages")
- Best Match (name + score% — who is your top prospect right now)
- Avg Compatibility (percentage with a thin circular progress indicator)

Style these metric cards with:
- White background, 0.5px warm border
- Large number in Playfair Display
- Label in small system font, muted color
- Subtle gold left border accent (3px)

===========================================
SECTION 3: TODAY'S ACTIONS (NEW — smart nudges)
===========================================

Add a "Needs Attention" section that shows smart, actionable prompts based on prospect data:

Auto-generate these nudges by checking:
- Prospect added more than 3 days ago but still in "New Lead" → "Review [Name]'s biodata — added 5 days ago"
- Prospect in "Call Done" stage but no call logged → "Log your call with [Name]"
- Prospect has kundli data but no kundli score → "[Name]'s kundli match is ready to calculate"  
- Prospect in "Meeting Fixed" but meeting prep not done → "Prepare for meeting with [Name]"
- Any prospect not updated in 7+ days → "Follow up with [Name] — no activity in [X] days"
- Prospect with 3+ red flags → "Review red flags for [Name] before proceeding"

Show these as tappable cards:
- Each nudge has: Icon (relevant emoji or simple indicator), text description, prospect name (tappable, goes to their detail), and a CTA button like "Review →" or "Log Call →"
- Max 3 nudges shown, with "See all" if more
- Style: Warm cream background (#FFF8F0), thin gold left border (3px), border-radius 10px
- If no nudges: Show "All caught up! No pending actions." with a checkmark

===========================================
SECTION 4: STAGE TABS + PROSPECT CARDS (redesigned)
===========================================

STAGE TABS:
- Horizontal scrollable row
- Each tab: Stage name + count in parentheses
- Active tab: Gold underline (2px), dark text
- Inactive tab: Muted text, no underline
- Only show stages that have at least 1 prospect
- Smooth scroll-snap between tabs

PROSPECT CARDS (inside each stage tab):
Make each card richer and more visual:

Card Layout:
┌─────────────────────────────────────────┐
│  [Photo]  Name                    Score │
│           Age · City · Profession       │
│  ────────────────────────────────────── │
│  ▰▰▰▰▰▰▱▱▱▱▱  Stage 5 of 11          │
│  ────────────────────────────────────── │
│  🟢 3 flags  🔴 1 flag  ⭐ 28/36      │
│  Source: Jeevansathi  ·  2 calls logged │
│  ────────────────────────────────────── │
│  Last activity: Called 2 days ago       │
│  [Quick Action Button based on stage]   │
└─────────────────────────────────────────┘

Quick Action Button (changes based on current stage):
- New Lead → "Review Biodata"
- Photos Shared → "Check Kundli"
- Kundli Sent → "View Kundli Report"
- Kundli Matched → "Schedule Call"
- Call Done → "Log Another Call"
- Family Talked → "Rate Family"
- Meeting Fixed → "Prep for Meeting"
- Met in Person → "Rate Meeting"
- Mutually Interested → "Next Steps"
- On Hold → "Resume"
- Closed → "View Summary"

Button style: Small, outlined in gold, Playfair Display font, sits at bottom-right of card.

STAGE PROGRESS BAR inside each card:
- Thin horizontal bar (4px height)
- Total width = 100%
- Filled portion = (current_stage_index / 10) * 100%
- Fill color: Gold gradient
- Background: #E8E0D2
- Border-radius: 2px
- Below the bar: "Stage X of 11" in tiny muted text

===========================================
SECTION 5: FLOATING ADD BUTTON
===========================================

Keep the gold "+" floating action button (bottom right, 54px circle).
Position it 20px above the bottom tab bar.
Gold gradient background, white "+" icon, shadow.

===========================================
CARD INTERACTIONS
===========================================

1. Tap card → Navigate to prospect detail page
2. Quick action button → Navigates to relevant section (e.g., "Log Call" opens the Calls tab on prospect detail)
3. Nudge cards → Navigate to the specific prospect with relevant tab open

===========================================
EMPTY STATE
===========================================

When no prospects exist, show:
- Large elegant illustration area (just a subtle gold outlined circle with "K" monogram)
- "Begin your journey" in Playfair Display
- "Add your first prospect to start tracking" in muted text
- Gold "Add Prospect" button (not just the floating "+")

===========================================
ANIMATIONS
===========================================

- Journey path: Draws in from left to right on page load (CSS animation, 0.8s)
- Metric cards: Fade up staggered (100ms between each)
- Nudge cards: Slide in from right (200ms stagger)
- Prospect cards: Fade in staggered within each stage tab
- Tab switch: Content crossfade (150ms)
- Progress bars: Fill animation from 0 to current value (0.5s ease-out)

===========================================
TECHNICAL NOTES
===========================================

1. The nudges should be computed client-side from the prospects data — no new database queries needed
2. "Last activity" can be derived from the latest note, conversation, or stage change timestamp
3. Journey path can be SVG or pure CSS — keep it simple, no external libraries
4. All of this replaces only the Board tab content — do not touch Matches, Timeline, or Profile tabs
5. Keep mobile-first — test at 375px width
6. Build must pass with zero errors
