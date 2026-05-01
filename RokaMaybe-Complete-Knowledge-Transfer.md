# RokaMaybe (formerly Kutumbh) — Complete Project Knowledge Transfer

## THIS DOCUMENT CONTAINS EVERYTHING
Every decision, feature, bug fix, prompt, technical detail, and conversation from the entire build process. Use this as the single source of truth when continuing development in a new chat/project.

---

## TABLE OF CONTENTS
1. Project Origin & Concept
2. Name History
3. Complete Feature List (what's built)
4. Technical Architecture
5. Database Schema
6. All Third-Party Services & Credentials
7. Scoring Algorithms (exact formulas)
8. Every Bug Found & Fixed
9. Every Prompt Given to Claude Code (chronological)
10. Design Decisions & Evolution
11. Deployment Setup
12. Files & Project Structure
13. Known Issues Still Open
14. Future Features Discussed But Not Built
15. All Links & Resources
16. How to Continue Building

---

## 1. PROJECT ORIGIN & CONCEPT

### The Problem
Komal Singhania is in the arranged marriage market in India (Marwadi community). She uses Shaadi.com, Jeevansathi, and gets prospects through relatives. She had no way to:
- Track 5-15 prospects simultaneously across platforms
- Compare them on compatibility, kundli, family quality
- Log conversations and impressions
- Make data-driven decisions instead of relying on memory

### The Solution
RokaMaybe is a personal CRM for the arranged marriage journey. Upload biodatas (AI extracts data), track prospects through 11 stages, score compatibility, match kundli, log calls, flag concerns, rate families, prepare for meetings, and use a decision matrix to choose.

### Target Market
- Primary: Indian women/men aged 22-35 actively in arranged marriage market
- Communities: Marwadi, Gujarati, Jain, Agarwal, Punjabi, Brahmin
- Secondary: Parents (ages 45-60) managing the search

### Revenue Model (discussed, not implemented)
- Freemium: Track up to 5 prospects free, unlimited with premium
- Premium features: AI extraction, detailed kundli reports, family collaboration

---

## 2. NAME HISTORY

### Original Name: Kutumbh (कुटुम्भ)
- Meaning: "Family" in Sanskrit
- Chosen because arranged marriage is about two families coming together
- Hindi logo कुटुम्भ was displayed prominently

### Why Renamed
Research on April 23, 2026 revealed:
- Trademark congestion across multiple NICE classes on ipindia.gov.in
- "Kutumb" app by Primetrace Technologies (VC-backed, 1.3K+ ratings, 4.4 stars) dominates the app space
- 8+ apps use "[Brand] Kutumb" pattern — word is diluted
- kutumbh.in taken, kutumbh.com expensive, only kutumbh.app available
- Generic word = high trademark rejection risk

### New Name: RokaMaybe
- "Roka" = the commitment ceremony in arranged marriages
- "Maybe" = the modern uncertainty/deliberation before committing
- Unique, trademarkable, domain-friendly
- Logo: "Roka" in serif (cream/dark), "Maybe" in italic serif (coral #C17858)
- No Hindi text in new branding

---

## 3. COMPLETE FEATURE LIST (what's built)

### 3.1 Authentication
- Google Sign-In via Firebase Auth
- Email/Password as fallback
- User data tied to Firebase UID
- All data private per user

### 3.2 Onboarding (16 steps, one question per screen)
1. Name (text)
2. Gender (pill: Female/Male)
3. Age (number — auto-calculated from DOB if available)
4. City (text)
5. Education (pill: Graduate/Post Graduate/CA-CS-CMA/MBA/Engineer/Doctor/PhD/Other)
6. Profession (text)
7. Income (pill: <5 LPA/5-10/10-20/20-35/35-50/50+)
8. Diet (pill: Pure Veg/Jain/Eggetarian/Non-Veg)
9. Manglik (pill: Yes/No/Partial/Don't Know)
10. Nakshatra — auto-calculated from DOB/birth time/place, with manual fallback (27 options)
11. Preferred age min (number)
12. Preferred age max (number)
13. Preferred cities (text, comma separated)
14. Min income preference (pill)
15. Family type preference (pill: Joint/Nuclear/No Preference)
16. Non-negotiables (multi-select, 15 options in 4 categories + custom "Other")

Non-negotiables list (final version):
- Location & Living: Must Live in My City, NRI/Abroad Settlement, Joint Family Only, Nuclear Family Only
- Career & Finance: Must Work After Marriage, Must Not Work After Marriage, Must Be Financially Independent
- Family & Background: Inter-Caste Not Acceptable, Divorced Not Acceptable, Manglik Mismatch, Age Gap More Than 5 Years
- Values & Personality: Must Share Household Responsibilities, Must Respect My Career, No Controlling Behavior, Must Not Have Anger Issues
- Plus custom "Other" option with text input

Every step has a "Skip" option.

### 3.3 Biodata Upload & AI Extraction
- Upload PDF or image of biodata
- File sent to /api/extract-biodata (Next.js API route)
- Server calls Anthropic Claude API (model: claude-sonnet-4-5)
- AI extracts: name, age, gender, city, height, education, profession, income, familyType, diet, dobDate, dobTime, dobPlace, rashi, nakshatra, gotra, manglik, fatherOcc, motherOcc, siblings, property, phone
- Pre-fills form for user review
- "Paste biodata text" fallback for devices where file upload doesn't work
- Works for both user profile and prospect addition
- accept="*/*" for Android compatibility (some devices block file picker with image/*)

### 3.4 Prospect Management
- Add via biodata upload OR manual entry
- Source tracking: Matrimonial Website, Relative, Family Friend, Pandit ji, Community Event, Other
- Photos: Up to 3 per prospect, stored as compressed base64 in Firestore (max 200KB each)
- Profile photo for user account

### 3.5 The 11 Stages
1. New Lead ✦
2. Photos Shared 📸
3. Kundli Sent ⭐
4. Kundli Matched ✅
5. Call Done 📞
6. Family Talked 👨‍👩‍👧
7. Meeting Fixed 📅
8. Met in Person 🤝
9. Mutually Interested 💚
10. On Hold ⏸
11. Closed ✕

Each stage change triggers a stage-specific prompt (StagePromptModal):
- New Lead → "What's your first impression?" with quick tags
- Photos Shared → Photo rating (1-5 stars)
- Kundli Sent → "Sent to whom?" tags
- Kundli Matched → "Pandit's verdict?" tags
- Call Done → Opens conversation tracker
- Family Talked → Opens family scorecard
- Meeting Fixed → Opens meeting prep checklist
- Met in Person → Opens post-meeting rating
- Mutually Interested → "Next steps?" with tags
- On Hold → "Why?" must select reason
- Closed → "Why?" must select reason

### 3.6 Kundli Milan (Ashtakoot Scoring)
- Astronomical calculation using astronomy-engine npm library
- Calculates Moon's sidereal longitude from DOB + birth time + birth place
- Applies Lahiri Ayanamsa correction
- Derives: Rashi (0-11), Nakshatra (0-26), Pada (1-4)
- Indian cities database: 130+ cities with lat/lng and IST offset
- City search with autocomplete

Full Ashtakoot Milan (8 koots, max 36 points):
1. Varna (1 pt) — nakshatra caste group
2. Vashya (2 pts) — zodiac compatibility
3. Tara (3 pts) — birth star count ÷ 9
4. Yoni (4 pts) — animal symbol compatibility
5. Graha Maitri (5 pts) — rashi lord friendship
6. Gana (6 pts) — Dev/Manush/Rakshas
7. Bhakut (7 pts) — rashi combination
8. Nadi (8 pts) — same nadi = 0 (critical dosha)

Dosha detection: Nadi Dosha, Bhakut Dosha, Gana Dosha

Score interpretation:
- 0-17: ❌ Not Recommended
- 18-23: ⚠️ Acceptable
- 24-31: ✅ Good Match
- 32-36: 💚 Excellent

Kundli Report UI: Summary card + 8-koot scorecard + dosha alerts + birth details comparison + disclaimer

### 3.7 Compatibility Scoring
Weighted percentage based on user preferences vs prospect:
- Age match: 15 pts (full if in range, partial if within 2 years)
- City match: 15 pts (checks preferred list)
- Diet: 12 pts (same=full, veg/jain crossover=partial)
- Family type: 10 pts (matches preference or no preference)
- Manglik: 10 pts (same or partial=full)
- Education: 10 pts (professional degree bonus)
- Income: 13 pts (meets minimum)
Total: 85 pts normalized to percentage

Overall Score = (Kundli/36 × 50) + (Compatibility/100 × 50)

### 3.8 Conversation Tracker
Log every call/chat with tap-to-select:
- Type: First Phone Call, Second Phone Call, Third+, Video Call, WhatsApp Chat, In-Person Chat, Family Call
- Duration: Under 10 mins, 10-20, 20-40, 40-60, 1 hour+
- Topics (18 multi-select): Career & Work, Education Background, Family Values, Living Arrangements, Future Plans & Goals, Financial Expectations, Wedding Expectations, Hobbies & Interests, Food & Lifestyle, Travel Preferences, Children & Parenting Views, In-Laws Expectations, Religious Practices, Social Habits, Past Relationships, Health & Medical, Property & Assets, Relocation Willingness
- Mood After (5 emojis): Really Positive, Good, Neutral, Slightly Negative, Bad Feeling
- Their Vibe: Very Interested, Interested, Hard to Read, Seemed Disinterested, Rude/Off-putting
- Follow-up: Definitely want to talk again, Maybe need to think, Not sure, Don't want to continue
- Optional text note

### 3.9 Red Flags & Green Flags
15 Green Flags (tap to select):
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

15 Red Flags (tap to select):
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

Plus custom flag option (green or red with text input)

### 3.10 Family Compatibility Scorecard
8 dimensions rated on 1-5 stars:
1. Response Time (Ghost for days ↔ Reply within hours)
2. Respectfulness (Rude/Demanding ↔ Very polite & warm)
3. Transparency (Hide things/Vague ↔ Crystal clear)
4. Values Alignment (Completely different ↔ Very aligned)
5. Financial Compatibility (Excessive demands ↔ Very reasonable)
6. Openness to Discussion (My way or highway ↔ Very flexible)
7. Communication Style (Through middlemen only ↔ Direct & warm)
8. Respect for Your Family (Dismissive ↔ Very respectful)

### 3.11 Meeting Planner
Pre-meeting (stage = Meeting Fixed):
- 6-item preparation checklist (tap to check off)
- 15 suggested questions to ask (selectable per prospect, custom questions addable)

Post-meeting (stage = Met in Person):
10 rating dimensions (1-5 stars each):
1. Appearance Match
2. Conversation Quality
3. Connection Felt
4. Family Impression
5. Financial Stability
6. Social Skills
7. Friend Circle & Lifestyle
8. Family Values & Preferences
9. Emotional Maturity
10. Communication Style
+ Gut Feeling (Yes/Maybe/No)
+ Meeting Notes (text)

Supports multiple meetings (First/Second/Third) with separate ratings and comparison between meetings.

### 3.12 Decision Matrix
Compare 2-3 prospects side by side on 18 dimensions:
- Kundli Score, Compatibility, Total Conversations, Average Mood, Green Flags, Red Flags, Family Score, Meeting Rating, Connection, Gut Feeling, Days Since Added, Current Stage, and more
- Rule-based summary highlighting strongest candidate
- Winner starred in each category

### 3.13 Activity Timeline
Chronological feed of all actions:
- Prospect added, stage changed, call logged, flag added, family scored, meeting rated
- Filterable by type
- Stored in activityLog Firestore collection

### 3.14 Dashboard (Board tab)
- Journey snapshot: Visual path showing prospects across stages
- 3 metric cards: Total Prospects, Best Match (name + %), Avg Compatibility
- "Needs Attention" smart nudges (auto-generated from data)
- Swipeable stage tabs with prospect cards
- Prospect cards show: photo, name, score, stage progress bar, flags, source, calls, last activity, context-aware quick action button

### 3.15 Navigation
Bottom tab bar with 4 tabs:
- Board (home) — Kanban-style stage view
- Matches (heart) — Two sub-tabs: By Compatibility, By Kundli
- Timeline (clock) — Activity feed
- Profile (user) — Settings and profile edit

Header: Logo left, user avatar right (clickable → profile)

---

## 4. TECHNICAL ARCHITECTURE

### Tech Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Next.js API routes (serverless)
- Database: Firebase Firestore (NoSQL)
- Auth: Firebase Authentication (Google + Email/Password)
- AI: Anthropic Claude API (model: claude-sonnet-4-5) for biodata extraction
- Kundli: astronomy-engine npm + custom Vedic lookup tables
- Hosting: Vercel (free tier)
- Photos: Base64 in Firestore (compressed, max 200KB each)
- Cities: Built-in database of 130+ Indian cities with lat/lng

### Project Structure
```
src/
├── app/
│   ├── page.tsx — Landing/login page
│   ├── layout.tsx — Root layout with auth provider
│   ├── onboarding/page.tsx — 16-step profile setup
│   ├── dashboard/page.tsx — Main dashboard (Board/Matches/Timeline/Profile tabs)
│   ├── prospects/
│   │   ├── new/page.tsx — Add prospect
│   │   └── [id]/page.tsx — Prospect detail
│   ├── compare/page.tsx — Decision Matrix
│   ├── profile/page.tsx — Edit profile
│   └── api/
│       └── extract-biodata/route.ts — AI extraction (server-side)
├── components/
│   ├── ConversationTimeline.tsx
│   ├── StagePromptModal.tsx
│   ├── StarRating.tsx
│   ├── KundliReport.tsx
│   ├── FlagsList.tsx
│   ├── FamilyScorecard.tsx
│   ├── MeetingPlanner.tsx
│   └── ... other components
├── lib/
│   ├── firebase.ts — Firebase config
│   ├── firestore.ts — All database operations
│   ├── scoring.ts — Compatibility algorithms
│   ├── kundli.ts — Ashtakoot Milan + astronomical calculation
│   └── indian-cities.ts — City database with coordinates
└── types/ — TypeScript type definitions
```

---

## 5. DATABASE SCHEMA (Firestore)

### users/{uid}
name, age, gender, city, education, profession, income, diet, manglik, nakshatra (index 0-26), gotra, rashi, dobDate, dobTime, dobPlace, prefAgeMin, prefAgeMax, prefCities, prefIncome, prefFamily, dealbreakers (array), profilePhoto (base64), createdAt, updatedAt

### users/{uid}/prospects/{prospectId}
name, age, city, height, education, profession, income, familyType, diet, manglik, gotra, rashi, nakshatra, dobDate, dobTime, dobPlace, fatherOcc, motherOcc, siblings, property, phone, source, stage, gunaScore, compatScore, firstImpression, photos (array of base64), addedDate, conversations (array), greenFlags (array), redFlags (array), familyScore (object), meetingPrep (object), meetingRating (object), onHoldReason, closedReason, createdAt, updatedAt

### users/{uid}/prospects/{prospectId}/notes/{noteId}
text, date, time, createdAt

### users/{uid}/activityLog/{logId}
type, prospectId, prospectName, details, timestamp

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 6. THIRD-PARTY SERVICES & CREDENTIALS

### Firebase
- Console: https://console.firebase.google.com
- Project: kutumbh-milaan (internal name, NOT changing)
- Auth: Google Sign-In + Email/Password enabled
- Database: Firestore in test mode
- Plan: Spark (free)
- Authorized domains: localhost, kutumbh-app.vercel.app (update with new domain)

### Anthropic API
- Console: https://console.anthropic.com
- Account: Komal Singhania (komal.singhania1222@gmail.com)
- Working model: claude-sonnet-4-5 (tested and confirmed)
- Models that DON'T work on this account: claude-sonnet-4-20250514, claude-3-5-sonnet-20241022, claude-3-sonnet-20240229, claude-3-haiku-20240307
- Balance: ~$4.74 remaining
- Cost per extraction: ~$0.003

### Vercel
- Dashboard: https://vercel.com/dashboard
- Project: kutumbh-app (rename to rokamaybe-app)
- Current URL: kutumbh-app.vercel.app
- Plan: Hobby (free)
- Environment variables needed:
  - NEXT_PUBLIC_FIREBASE_API_KEY
  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kutumbh-milaan.firebaseapp.com
  - NEXT_PUBLIC_FIREBASE_PROJECT_ID=kutumbh-milaan
  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kutumbh-milaan.firebasestorage.app
  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  - NEXT_PUBLIC_FIREBASE_APP_ID
  - ANTHROPIC_API_KEY
  - NEXT_PUBLIC_AI_ENABLED=true

### GitHub
- Account: komalsinghania1222
- Backup repo: kutumbh-backup (private)

---

## 7. SCORING ALGORITHMS (exact code logic)

### Kundli Guna Score
```
function gunaScore(userNakshatra, prospectNakshatra):
  if either is null/undefined → return null
  d = (prospectIndex - userIndex + 27) % 27
  varna = d%4===0 ? 1 : 0
  vashya = d%5<2 ? 2 : 0
  tara = (d%9)%2===0 ? 3 : 1
  yoni = d%7<3 ? 4 : d%7<5 ? 2 : 0
  graha = d%3===0 ? 5 : d%3===1 ? 3 : 0
  gana = d%3<2 ? 6 : 2
  bhakut = d%6<3 ? 7 : 3
  nadi = d%3!==0 ? 8 : 0
  return min(36, sum of all)
```
Note: The actual implementation in kundli.ts uses proper lookup tables from Vedic astrology, not this simplified formula.

### Compatibility Score
```
function compatScore(user, prospect):
  score=0, total=0
  Age: +15 if in preferred range, +8 if within 2 years → total+=15
  City: +15 if in preferred list → total+=15
  Diet: +12 same, +9 veg/jain crossover, +3 otherwise → total+=12
  Family: +10 if matches or no preference, +3 otherwise → total+=10
  Manglik: +10 if same/partial, +4 otherwise, 0 if mismatch → total+=10
  Education: +10 for professional degrees, +5 otherwise → total+=10
  Income: +13 if meets minimum, +5 partial → total+=13
  return round(score/total * 100)
```

### Overall Score
```
overall = (kundliScore/36 * 50) + (compatScore/100 * 50)
```

---

## 8. EVERY BUG FOUND & FIXED (chronological)

1. **Typing bug (artifact)**: Input components defined inside parent component caused React remounting. Fixed by moving Field, Pill, InputField components outside the main component.

2. **File upload not working (artifact)**: Artifact sandbox blocks file inputs. Tried hidden input + button click, label wrapping, transparent overlay — all blocked. Switched to paste-text approach.

3. **API calls blocked (artifact)**: Artifact sandbox blocks fetch to api.anthropic.com. Moved to Claude Code deployment.

4. **useState after conditional return**: React hooks called after early returns caused "too many re-renders". Moved all hooks to top of component.

5. **JSX quote escaping**: `ph="5'4\""` caused syntax errors. Fixed with template literals.

6. **Keyboard dismisses on every keystroke (mobile)**: Components Field, PillSelect, PillGroup defined inside page functions. React created new component types on every render, unmounting inputs. Fixed by moving to module level.

7. **AI extraction "invalid x-api-key"**: API key in Vercel had wrong value. Created new key and re-entered.

8. **AI extraction "model not found"**: Model name `claude-sonnet-4-20250514` not available on account. Tested all models, found `claude-sonnet-4-5` works.

9. **Prospect save failing**: Firestore security rules not set. Fixed by adding rules allowing authenticated users to read/write own data.

10. **Scrolling broken**: Bottom tab bar with position:fixed blocked content scrolling. Fixed by adding padding-bottom and overflow-y:auto.

11. **Score cards not showing values**: Dark header too tall, clipping content. Reduced header height, moved scores below header.

12. **Profile avatar not clickable**: Header KS circle had no onClick. Wrapped in button with navigation to Profile tab.

13. **File picker on Android**: Only showing Camera and Photos, no file browser. Changed accept to "*/*" for biodata uploads, added client-side validation.

14. **Biodata not extracting DOB/time/place**: AI prompt didn't handle combined formats like "23-07-1994; 02:43 AM (Howrah, West Bengal)". Updated extraction prompt.

15. **Age not auto-calculating**: No auto-calculation from DOB. Added auto-compute everywhere DOB exists.

---

## 9. EVERY PROMPT GIVEN TO CLAUDE CODE (chronological)

### Prompt 1: Initial Build (spec.md)
Full product spec — database schema, all screens, scoring logic, design theme, 11 stages, authentication. Built the entire app in 11 minutes.

### Prompt 2: Kundli Implementation
Astronomical calculation, Lahiri Ayanamsa, auto-calculate nakshatra from DOB/time/place, Ashtakoot Milan with 8 koot lookup tables, dosha detection, kundli report UI.

### Prompt 3: 8 Features (features.md)
Conversation Tracker, Red/Green Flags, Family Scorecard, Meeting Planner, Enhanced Stage Prompts, Decision Matrix, Activity Timeline, Enhanced Cards.

### Prompt 4: UI/UX Overhaul (design.md)
Premium luxury wedding invite aesthetic — Taj Hotel inspired. Color palette, typography, component styles, animations.

### Prompt 5: Navigation Overhaul (navigation.md)
Bottom tab bar (Board/Matches/Timeline/Profile), removed clutter, swipeable stage tabs, clean prospect cards.

### Prompt 6: Board Redesign (board.md)
Journey snapshot visualization, smart nudges, richer cards with context-aware quick actions.

### Prompt 7: Various fixes
Keyboard bug, API extraction, scrolling, score display, profile avatar, file picker, non-negotiables update, source options update, meeting rating dimensions, profile photo.

### Prompt 8: Rename to RokaMaybe
Global search-replace, new logo treatment (Roka + Maybe in different styles), coral accent color (#C17858), meta updates.

---

## 10. DESIGN DECISIONS & EVOLUTION

### Design Direction: "The Suite" (Concept 2)
Inspired by Taj Hotels / ITC luxury — rich but not loud, warm but restrained.

### Color Palette (current with coral refresh)
- Header: linear-gradient(170deg, #241C14, #1C1612)
- Body: #F9F6F0 (warm parchment)
- Cards: #FFFFFF
- Gold accent: #C4A265 (antique gold)
- NEW Coral accent: #C17858 (warm coral — for "Maybe" text, FAB button, secondary highlights)
- Text primary: #1C1612
- Text secondary: #6A5D4E
- Text muted: #9A8A75
- Green: #2D6B4F
- Red: #8B2A2A
- Border: #E8E0D2

### Typography
- Logo/headings: Playfair Display (serif)
- Body: System font stack
- Logo: "Roka" in Playfair 500 cream, "Maybe" in Playfair 400 italic coral

### Rejected Designs
- Options A-C: Too basic, generic fonts
- Options D-I: Midnight Navy, Marble+Emerald, Blush+Copper, Black+Dual Metal, Forest Green — all rejected as not matching Taj/ITC luxury feel
- Rose gold direction: Rejected
- Hindi-heavy branding: Removed in rebrand

---

## 11. DEPLOYMENT SETUP

### Local Development
```
cd C:\Users\komal\kutumbh-app
npm run dev
→ opens at http://localhost:3000
```

### Deploy to Vercel
```
cd C:\Users\komal\kutumbh-app
npx vercel --prod
```

### Claude Code
```
cd C:\Users\komal\kutumbh-app
claude
```

### Environment Variables (needed in both .env.local AND Vercel)
```
NEXT_PUBLIC_FIREBASE_API_KEY=<your key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kutumbh-milaan.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kutumbh-milaan
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kutumbh-milaan.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your app id>
ANTHROPIC_API_KEY=<your sk-ant key>
NEXT_PUBLIC_AI_ENABLED=true
```

### Firebase Auth Authorized Domains
Must include your Vercel URL (e.g., rokamaybe-app.vercel.app)

---

## 12. KNOWN ISSUES STILL OPEN

1. **File upload on some Android tablets** — still only shows Camera/Photos, no file browser on certain OnePlus devices even with accept="*/*". Workaround: paste text option exists.

2. **Prospect detail header** — score cards layout was fixed but may still need refinement on very small screens.

3. **Journey tracker labels** — was being fixed (stage name labels under dots) — may or may not be deployed yet.

4. **Biodata extraction quality** — sometimes misses combined DOB/time/place fields. Prompt improvement may be needed.

5. **No custom domain** — still on vercel.app URL.

6. **Firebase project ID** — still "kutumbh-milaan" internally (doesn't affect users, but noted).

7. **Test API routes** — /api/test-key and /api/test-extraction may still exist in codebase. Should be deleted.

---

## 13. FUTURE FEATURES DISCUSSED BUT NOT BUILT

1. **Mummy Mode** — Simplified view for parents. They see: biodata summary, photos, kundli score, family details. They can leave verdicts (Yes/No/Need to discuss) and comments. Doesn't show: flags, conversation tracker, meeting prep, decision matrix.

2. **Family Collaboration** — Parents get own login, view shortlisted prospects, vote yes/no.

3. **Pandit Consultation Booking** — Connect with verified pandits for detailed kundli analysis.

4. **WhatsApp Integration** — Import prospect details from WhatsApp.

5. **Community-Specific Filters** — Marwadi, Gujarati, Punjabi specific fields.

6. **Push Notifications** — Follow-up reminders, pending checks.

7. **Trusted Referral Network** — Community members vouch for families.

8. **Family Alignment Questionnaire** — Anonymous compatibility survey for both families.

9. **AI Conversation Coach** — Suggested topics based on history.

10. **Mobile App** — React Native for iOS/Android.

11. **Multi-language** — Hindi, Gujarati, Marathi interfaces.

12. **Landing Page** — Was being designed in a separate chat. Marketing landing page with hero, features, how it works, social proof.

---

## 14. ALL LINKS & RESOURCES

| Resource | URL |
|----------|-----|
| Firebase Console | https://console.firebase.google.com |
| Anthropic Console | https://console.anthropic.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| GitHub | https://github.com/komalsinghania1222 |
| Node.js | https://nodejs.org |
| Claude Code Docs | https://docs.claude.com/en/docs/claude-code/overview |
| Next.js Docs | https://nextjs.org/docs |
| Tailwind CSS Docs | https://tailwindcss.com/docs |
| Firebase Auth Docs | https://firebase.google.com/docs/auth |
| Firestore Docs | https://firebase.google.com/docs/firestore |
| DPDPA 2023 (India) | https://www.meity.gov.in/data-protection-framework |
| Trademark (India) | https://ipindia.gov.in/trade-marks.htm |
| Live App | https://kutumbh-app.vercel.app (will change after rename) |

---

## 15. HOW TO CONTINUE BUILDING

### Starting a new chat
1. Create a new Claude project called "RokaMaybe"
2. Upload this document as a project knowledge file
3. In the new chat, say: "I'm continuing development of RokaMaybe. I've uploaded the complete project knowledge transfer document. Please read it and confirm you understand the full context."

### Making changes
1. Open Claude Code: `cd C:\Users\komal\kutumbh-app && claude`
2. Describe what you want changed
3. Let Claude Code make the changes
4. Deploy: `npx vercel --prod`

### If something breaks
1. The backup is at `C:\Users\komal\kutumbh-backup`
2. Git history has all commits
3. You can always revert: `git checkout .` to undo uncommitted changes

### Key things to remember
- Model name: claude-sonnet-4-5 (NOT claude-sonnet-4-20250514)
- Firebase project ID stays as kutumbh-milaan (internal only)
- Environment variables needed in BOTH .env.local AND Vercel
- After Vercel env var changes, must redeploy for them to take effect
- The app folder on Komal's computer: C:\Users\komal\kutumbh-app
- Backup folder: C:\Users\komal\kutumbh-backup

---

## 16. LEGAL NOTES (from Project Bible)

- Privacy Policy needed (DPDPA 2023 compliance)
- Terms of Service needed
- Photo consent framework needed
- Kundli disclaimer: "Computerized calculation for reference only. Consult a qualified Jyotish pandit."
- Register "RokaMaybe" trademark (Class 9 for software, Class 45 for matchmaking)
- Domain: Check rokamaybe.com, rokamaybe.in, rokamaybe.app availability

---

END OF DOCUMENT
This document was created on April 24, 2026 and contains the complete history of the RokaMaybe (formerly Kutumbh) project from inception to current state.
```
