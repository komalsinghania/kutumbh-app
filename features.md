Add all of the following features to the Kutumbh app. Every feature must use tappable buttons, selectable tags, star ratings, and checklists — users should NEVER need to type unless adding a custom note. Everything is tap-to-select.

===========================================
FEATURE 1: CONVERSATION TRACKER
===========================================

Add a "Calls & Chats" tab on the prospect detail page. Each conversation is logged with:

A) Call Type (tap to select one):
- First Phone Call
- Second Phone Call  
- Third+ Phone Call
- Video Call
- WhatsApp Chat
- In-Person Chat
- Family Call

B) Duration (tap to select):
- Under 10 mins
- 10-20 mins
- 20-40 mins
- 40-60 mins
- 1 hour+

C) Topics Discussed (multi-select tags — tap all that apply):
- Career & Work
- Education Background
- Family Values
- Living Arrangements (Joint/Nuclear)
- Future Plans & Goals
- Financial Expectations
- Wedding Expectations
- Hobbies & Interests
- Food & Lifestyle
- Travel Preferences
- Children & Parenting Views
- In-Laws Expectations
- Religious Practices
- Social Habits
- Past Relationships
- Health & Medical
- Property & Assets
- Relocation Willingness

D) Your Mood After Call (tap one emoji):
- 😊 Really Positive
- 🙂 Good
- 😐 Neutral
- 😕 Slightly Negative
- 😞 Bad Feeling

E) Their Vibe (tap one):
- Very Interested
- Interested
- Hard to Read
- Seemed Disinterested
- Rude / Off-putting

F) Follow-up? (tap one):
- Definitely want to talk again
- Maybe, need to think
- Not sure about this one
- Don't want to continue

G) Optional text note field for anything else.

Show conversations as a timeline on the prospect page. Each entry shows date, type, duration, topic tags, mood emoji, and note.

===========================================
FEATURE 2: RED FLAGS & GREEN FLAGS
===========================================

Add a "Flags" section on prospect detail page. User taps + to add a flag, selects Red or Green, then picks from pre-built lists:

GREEN FLAGS (15 options — tap to select):
1. Respectful in conversation
2. Good listener — asks questions back
3. Clear about career goals
4. Honest and transparent
5. Respects your opinions even when disagreeing
6. Family is warm and welcoming
7. Financially responsible
8. Has hobbies and interests beyond work
9. Speaks well about their family
10. Punctual — calls/meets on time
11. Makes effort to know your family
12. Supportive of your career/ambitions
13. Good sense of humor
14. Mature way of handling disagreements
15. Consistent behavior — no mixed signals

RED FLAGS (15 options — tap to select):
1. Rude or dismissive in conversation
2. Avoids answering direct questions
3. Talks only about themselves
4. Disrespectful about your career/education
5. Controlling behavior — tells you what to do
6. Family is demanding or rude
7. Unclear about finances / suspicious
8. Still seems attached to an ex
9. Lies or exaggerates about themselves
10. Pressuring for quick decision
11. Drinks/smokes but hid it initially
12. Disrespectful to waitstaff/service people
13. Very different lifestyle expectations
14. Bad-mouths their own family
15. Inconsistent — says one thing, does another

Each flag shows as a colored chip on the prospect card (green or red). On the detail page, show all flags with dates they were added. Show a summary: "5 Green Flags, 2 Red Flags" prominently.

Also allow adding a CUSTOM flag with a short text if none of the pre-built ones fit.

===========================================
FEATURE 3: FAMILY COMPATIBILITY SCORECARD
===========================================

Add a "Family Score" section on prospect detail page. Rate these on a 1-5 star scale (tap stars):

1. Response Time — How quickly does their family respond?
   (1=Ghost you for days, 5=Reply within hours)

2. Respectfulness — How respectful is their family in communication?
   (1=Rude/Demanding, 5=Very polite and warm)

3. Transparency — Are they open about expectations?
   (1=Hide things/Vague, 5=Crystal clear about everything)

4. Values Alignment — Do their family values match yours?
   (1=Completely different, 5=Very aligned)

5. Financial Compatibility — Are they reasonable about wedding/gifts?
   (1=Excessive demands, 5=Very reasonable)

6. Openness — Are they open to discussion and compromise?
   (1=My way or highway, 5=Very flexible)

7. Communication Style — How do they communicate?
   (1=Through middlemen only, 5=Direct and warm)

8. Respect for Your Family — How do they treat your family?
   (1=Dismissive, 5=Very respectful)

Show overall Family Score as average out of 5 stars. Show on prospect card as a small badge.

===========================================
FEATURE 4: MEETING PLANNER & POST-MEETING LOG
===========================================

When prospect stage moves to "Meeting Fixed" or "Met in Person", show these sections:

A) PRE-MEETING PREPARATION (checklist — tap to check off):
- Decide what to wear
- Research their background one more time
- Prepare questions to ask
- Discuss with parents what to observe
- Confirm meeting time and place
- Keep backup plan if meeting goes wrong

B) QUESTIONS TO ASK (suggested list — tap to mark as "Asked"):
- What does a typical day look like for you?
- Where do you see yourself in 5 years?
- What's your relationship with your siblings like?
- How do you handle disagreements?
- What are your expectations from marriage?
- How do you feel about working after marriage?
- What role does religion play in your daily life?
- How often do you want to visit family after marriage?
- What's your take on finances — joint or separate?
- Do you have any health conditions I should know about?
- What are your hobbies outside work?
- How do you feel about pets?
- What kind of wedding do you envision?
- Have you been in a relationship before?
- What made you say yes to meeting me?

C) POST-MEETING RATING (tap to rate each):

Appearance Match (1-5 stars):
(1=Very different from photos, 5=Exactly as expected or better)

Conversation Quality (1-5 stars):
(1=Awkward/Dead silence, 5=Flowed naturally, great chemistry)

Connection Felt (1-5 stars):
(1=No connection at all, 5=Strong spark/connection)

Family Impression — if family was present (1-5 stars):
(1=Did not like them, 5=Loved them)

Gut Feeling (tap one):
- 💚 Yes — I want to move forward
- 🟡 Maybe — Need more time to decide
- 🔴 No — I don't see this working

D) Meeting Notes — optional text field

===========================================
FEATURE 5: ENHANCED STAGE FLOW WITH PROMPTS
===========================================

When a prospect's stage is changed, show a stage-specific prompt/form:

STAGE: NEW LEAD → 
Prompt: "What's your first impression?" 
Quick tags to select: Looks promising, Need more info, Parents suggested, Not sure yet

STAGE: PHOTOS SHARED →
Prompt: "Rate their photos"
- Photo Match Expectation (1-5 stars)
- Overall Appearance (1-5 stars)
- Quick tags: Better than expected, As expected, Below expectations, Edited/Filtered photos

STAGE: KUNDLI SENT →
Auto-show: Kundli report if birth details available
Prompt: "Kundli sent to whom?" Tags: Family Pandit, Online Service, Self-Checked

STAGE: KUNDLI MATCHED →
Auto-show: Full Ashtakoot scorecard
Prompt: "Pandit's verdict?" Tags: Approved, Approved with remedies, Not recommended, Doshas found

STAGE: FIRST CALL DONE →
Auto-open: Conversation Tracker form (Feature 1) pre-set to "First Phone Call"

STAGE: FAMILY TALKED →
Prompt: "How did the family interaction go?"
Auto-open: Family Scorecard (Feature 3) to fill ratings
Quick tags: Families got along, Some concerns, Did not go well

STAGE: MEETING FIXED →
Auto-open: Meeting Planner pre-meeting checklist (Feature 4A)
Prompt: "When and where?" Date picker + location field

STAGE: MET IN PERSON →
Auto-open: Post-Meeting Rating form (Feature 4C)

STAGE: MUTUALLY INTERESTED →
Prompt: "What are next steps?"
Tags: Roka discussion, Engagement planning, Need more meetings, Families to meet again
Date picker for next milestone

STAGE: ON HOLD →
Prompt: "Why on hold?" (must select one)
Tags: Waiting for their response, Comparing with others, Family needs time, Financial discussions pending, Kundli concerns, Need more meetings, Personal reasons

STAGE: CLOSED →
Prompt: "Why did this close?" (must select one)  
Tags: Kundli didn't match, They said no, I said no, Family said no, Found someone better, Mutual decision, Ghosted/No response, Lifestyle mismatch, Financial mismatch, Location issue, Age gap concern

===========================================
FEATURE 6: DECISION MATRIX
===========================================

Add a "Help Me Decide" page accessible from the dashboard. User selects 2-3 prospects to compare on EVERYTHING — not just biodata but their logged experiences:

Show a comparison table with these rows:
- Kundli Score (X/36)
- Compatibility Score (X%)
- Total Conversations logged
- Average Mood After Calls (emoji)
- Green Flags count
- Red Flags count  
- Family Score (X/5 stars)
- Meeting Rating — if met (X/5)
- Connection Felt (X/5)
- Gut Feeling (emoji)
- Days Since Added
- Current Stage

At the bottom, show AI-generated summary (or rule-based):
"Based on your logged interactions, Prospect A has more green flags, higher family compatibility, and better conversation quality. Prospect B has a stronger kundli match but you've noted 3 red flags."

Highlight the winner in each category with a star.

===========================================
FEATURE 7: ACTIVITY TIMELINE
===========================================

Add a "Timeline" tab on the dashboard. Shows a chronological feed of ALL activity across ALL prospects:

Each entry shows:
- Date and time
- Prospect name (tappable to go to their detail)
- What happened (auto-generated from actions)

Examples:
"Jan 15 — Added Rahul Sharma via Jeevansathi"
"Jan 17 — Kundli checked for Rahul: 28/36 ✅ Good Match"
"Jan 18 — First call with Rahul: 30 mins, discussed Career & Family Values, mood: 😊"
"Jan 19 — Added Green Flag for Rahul: Good listener"  
"Jan 20 — Added Amit Gupta via Relative"
"Jan 22 — Stage changed: Rahul → Family Talked"
"Jan 22 — Family Score for Rahul: 4.2/5 ⭐"
"Jan 25 — Meeting with Rahul at Marriott, Rating: 4/5"
"Jan 28 — Added Red Flag for Amit: Avoids direct questions"

Auto-generate these entries whenever user takes any action. Store in Firestore as a timeline collection.

Filter options: All Activity, Specific Prospect, Calls Only, Flags Only, Stage Changes Only

===========================================
FEATURE 8: PROSPECT CARD ENHANCEMENTS  
===========================================

Update each prospect card on the dashboard to show:
- Profile photo (circular, left side)
- Name, age, city, profession
- Overall score badge
- Kundli mini badge (28/36)
- Stage pill
- Source pill
- Green flags count (green dot with number)
- Red flags count (red dot with number)  
- Family score (mini stars)
- Last activity date ("Last: 2 days ago")
- Number of conversations logged

This makes each card information-dense so users can scan quickly without opening each prospect.

===========================================
IMPORTANT UI RULES FOR ALL FEATURES:
===========================================
1. EVERYTHING is tap-to-select. Pre-built options everywhere. Users should rarely need to type.
2. All multi-select options use pill/chip buttons that toggle on/off.
3. All ratings use tappable star components (1-5).
4. All single-select options use pill buttons where selected one is highlighted.
5. Optional text fields are always labeled "Add a note (optional)" and placed at the bottom.
6. Every action auto-saves to Firestore immediately.
7. Every action creates a Timeline entry (Feature 7).
8. Mobile-first design — everything must work perfectly on phone screens.
9. Use the existing warm earthy color theme (henna, cream, bark, gold).
10. Loading states for all save operations.
