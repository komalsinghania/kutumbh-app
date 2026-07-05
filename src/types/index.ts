export type Gender = 'Female' | 'Male';
export type Diet = 'Pure Veg' | 'Jain' | 'Eggetarian' | 'Non-Veg';
export type Manglik = 'Yes' | 'No' | 'Partial' | "Don't Know";
export type FamilyType = 'Joint' | 'Nuclear' | 'No Preference';
export type Education =
  | 'Graduate'
  | 'Post Graduate'
  | 'CA-CS-CMA'
  | 'MBA'
  | 'Engineer'
  | 'Doctor'
  | 'PhD'
  | 'Other';
export type Income =
  | '< 5 LPA'
  | '5-10'
  | '10-20'
  | '20-35'
  | '35-50'
  | '50+';
export type IncomePref =
  | 'No Preference'
  | '5+'
  | '10+'
  | '20+'
  | '35+'
  | '50+';
export type ProspectSource =
  | 'Matrimonial Website'
  | 'Shaadi.com'
  | 'Jeevansathi'
  | 'BharatMatrimony'
  | 'Relative'
  | 'Family Friend'
  | 'Pandit ji'
  | 'Community Event'
  | 'Other';
export type ProspectStage =
  | 'new'
  | 'photo_exchanged'
  | 'kundli_sent'
  | 'kundli_matched'
  | 'call_done'
  | 'family_call'
  | 'meeting_fixed'
  | 'met'
  | 'interested'
  | 'on_hold'
  | 'rejected';

export const STAGE_LABELS: Record<ProspectStage, string> = {
  new: 'New Lead ✦',
  photo_exchanged: 'Photos Shared 📸',
  kundli_sent: 'Kundli Sent ⭐',
  kundli_matched: 'Kundli Matched ✅',
  call_done: 'Call Done 📞',
  family_call: 'Family Talked 👨‍👩‍👧',
  meeting_fixed: 'Meeting Fixed 📅',
  met: 'Met in Person 🤝',
  interested: 'Mutually Interested 💚',
  on_hold: 'On Hold ⏸',
  rejected: 'Closed ✕',
};

export const STAGE_COLORS: Record<ProspectStage, string> = {
  new: 'bg-gray-100 text-gray-700',
  photo_exchanged: 'bg-blue-100 text-blue-700',
  kundli_sent: 'bg-yellow-100 text-yellow-700',
  kundli_matched: 'bg-green-100 text-green-700',
  call_done: 'bg-purple-100 text-purple-700',
  family_call: 'bg-orange-100 text-orange-700',
  meeting_fixed: 'bg-red-100 text-red-700',
  met: 'bg-teal-100 text-teal-700',
  interested: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-gray-200 text-gray-600',
  rejected: 'bg-red-100 text-red-500',
};

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

export const DEALBREAKER_CATEGORIES = [
  {
    label: 'Location & Living',
    items: [
      'Must Live in My City',
      'NRI / Abroad Settlement',
      'Joint Family Only',
      'Nuclear Family Only',
    ],
  },
  {
    label: 'Career & Finance',
    items: [
      'Must Work After Marriage',
      'Must Not Work After Marriage',
      'Must Be Financially Independent',
    ],
  },
  {
    label: 'Family & Background',
    items: [
      'Inter-Caste Not Acceptable',
      'Divorced Not Acceptable',
      'Manglik Mismatch',
      'Age Gap More Than 5 Years',
    ],
  },
  {
    label: 'Values & Personality',
    items: [
      'Must Share Household Responsibilities',
      'Must Respect My Career',
      'No Controlling Behavior',
      'Must Not Have Anger Issues',
    ],
  },
] as const;

export const DEALBREAKERS = DEALBREAKER_CATEGORIES.flatMap(c => c.items);

export const HOBBIES = [
  'Reading', 'Travelling', 'Cooking', 'Music', 'Movies', 'Fitness / Gym',
  'Yoga', 'Meditation', 'Dancing', 'Photography', 'Cricket', 'Sports',
  'Trekking', 'Gardening', 'Painting', 'Writing', 'Singing', 'Gaming',
  'Cooking Shows', 'Volunteering', 'Investing', 'Fashion',
] as const;

export interface UserProfile {
  uid: string;
  name: string;
  age: number;
  gender: Gender;
  city: string;
  education: Education;
  profession: string;
  income: Income;
  diet: Diet;
  manglik: Manglik;
  nakshatra: number;
  rashiIndex?: number;  // 0-11, derived from DOB
  gotra?: string;
  rashi?: string;
  dobDate?: string;     // YYYY-MM-DD
  dobTime?: string;     // HH:MM (24h)
  dobPlace?: string;
  prefAgeMin: number;
  prefAgeMax: number;
  prefCities: string[];
  prefIncome: IncomePref;
  prefFamily: FamilyType;
  dealbreakers: string[];
  hobbies?: string[];
  // Payment / subscription
  isPaid?: boolean;
  paidAt?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Prospect {
  id: string;
  name: string;
  age: number;
  city: string;
  height?: string;
  education: string;
  profession: string;
  income: string;
  familyType?: string;
  diet?: string;
  manglik?: string;
  gotra?: string;
  rashi?: string;
  nakshatra?: number;   // 0-26 index
  rashiIndex?: number;  // 0-11, derived from DOB
  dobDate?: string;
  dobTime?: string;
  dobPlace?: string;
  fatherOcc?: string;
  motherOcc?: string;
  siblings?: string;
  property?: string;
  phone?: string;
  hobbies?: string[];
  source: ProspectSource;
  stage: ProspectStage;
  gunaScore: number | null;
  compatScore: number | null;
  firstImpression?: string;
  photos?: string[]; // base64 data URLs, max 3
  addedDate: string;
  createdAt: number;
  updatedAt: number;
  noteCount?: number;
  // Denormalized summary fields (written after subcollection mutations)
  greenFlagCount?: number;
  redFlagCount?: number;
  familyScore?: number;       // average 1-5
  conversationCount?: number;
  lastActivityAt?: number;    // epoch ms
}

export interface Note {
  id: string;
  text: string;
  date: string;
  time: string;
  createdAt: number;
}

export interface ExtractedBiodata {
  name?: string;
  age?: number;
  gender?: string;
  city?: string;
  height?: string;
  education?: string;
  profession?: string;
  income?: string;
  familyType?: string;
  diet?: string;
  dobDate?: string;
  dobTime?: string;
  dobPlace?: string;
  rashi?: string;
  nakshatra?: string;
  gotra?: string;
  manglik?: string;
  fatherOcc?: string;
  motherOcc?: string;
  siblings?: string;
  property?: string;
  phone?: string;
  hobbies?: string[];
}

// ── Feature: Conversations ────────────────────────────────────────────────────

export const CALL_TYPES = [
  'First Phone Call', 'Second Phone Call', 'Third+ Phone Call',
  'Video Call', 'WhatsApp Chat', 'In-Person Chat', 'Family Call',
] as const;

export const CALL_DURATIONS = [
  'Under 10 mins', '10-20 mins', '20-40 mins', '40-60 mins', '1 hour+',
] as const;

export const CONVERSATION_TOPICS = [
  'Career & Work', 'Education Background', 'Family Values',
  'Living Arrangements', 'Future Plans & Goals', 'Financial Expectations',
  'Wedding Expectations', 'Hobbies & Interests', 'Food & Lifestyle',
  'Travel Preferences', 'Children & Parenting', 'In-Laws Expectations',
  'Religious Practices', 'Social Habits', 'Past Relationships',
  'Health & Medical', 'Property & Assets', 'Relocation Willingness',
] as const;

export const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Really Positive' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😕', label: 'Slightly Negative' },
  { emoji: '😞', label: 'Bad Feeling' },
] as const;

export const THEIR_VIBE_OPTIONS = [
  'Very Interested', 'Interested', 'Hard to Read', 'Seemed Disinterested', 'Rude / Off-putting',
] as const;

export const FOLLOW_UP_OPTIONS = [
  'Definitely want to talk again', 'Maybe, need to think', 'Not sure about this one', "Don't want to continue",
] as const;

export interface ConversationLog {
  id: string;
  callType: string;
  duration: string;
  topics: string[];
  mood: string;
  theirVibe: string;
  followUp: string;
  note?: string;
  date: string;
  time: string;
  createdAt: number;
}

// ── Feature: Flags ────────────────────────────────────────────────────────────

export const GREEN_FLAGS = [
  'Respectful in conversation',
  'Good listener — asks questions back',
  'Clear about career goals',
  'Honest and transparent',
  'Respects your opinions even when disagreeing',
  'Family is warm and welcoming',
  'Financially responsible',
  'Has hobbies and interests beyond work',
  'Speaks well about their family',
  'Punctual — calls/meets on time',
  'Makes effort to know your family',
  'Supportive of your career/ambitions',
  'Good sense of humor',
  'Mature way of handling disagreements',
  'Consistent behavior — no mixed signals',
] as const;

export const RED_FLAGS = [
  'Rude or dismissive in conversation',
  'Avoids answering direct questions',
  'Talks only about themselves',
  'Disrespectful about your career/education',
  'Controlling behavior — tells you what to do',
  'Family is demanding or rude',
  'Unclear about finances / suspicious',
  'Still seems attached to an ex',
  'Lies or exaggerates about themselves',
  'Pressuring for quick decision',
  'Drinks/smokes but hid it initially',
  'Disrespectful to waitstaff/service people',
  'Very different lifestyle expectations',
  "Bad-mouths their own family",
  'Inconsistent — says one thing, does another',
] as const;

export interface Flag {
  id: string;
  type: 'green' | 'red';
  text: string;
  isCustom: boolean;
  date: string;
  createdAt: number;
}

// ── Feature: Family Scorecard ─────────────────────────────────────────────────

export const FAMILY_SCORECARD_DIMENSIONS = [
  { key: 'responseTime', label: 'Response Time', low: 'Ghost you for days', high: 'Reply within hours' },
  { key: 'respectfulness', label: 'Respectfulness', low: 'Rude / Demanding', high: 'Very polite & warm' },
  { key: 'transparency', label: 'Transparency', low: 'Hide things / Vague', high: 'Crystal clear' },
  { key: 'valuesAlignment', label: 'Values Alignment', low: 'Completely different', high: 'Very aligned' },
  { key: 'financialCompat', label: 'Financial Compatibility', low: 'Excessive demands', high: 'Very reasonable' },
  { key: 'openness', label: 'Openness to Discussion', low: 'My way or highway', high: 'Very flexible' },
  { key: 'commStyle', label: 'Communication Style', low: 'Through middlemen only', high: 'Direct & warm' },
  { key: 'respectForFamily', label: 'Respect for Your Family', low: 'Dismissive', high: 'Very respectful' },
] as const;

export type FamilyScorecardKey = typeof FAMILY_SCORECARD_DIMENSIONS[number]['key'];

export interface FamilyScorecard {
  scores: Partial<Record<FamilyScorecardKey, number>>;
  average: number;
  updatedAt: number;
}

// ── Feature: Meeting ──────────────────────────────────────────────────────────

export const PRE_MEETING_CHECKLIST = [
  'Decide what to wear',
  'Research their background one more time',
  'Prepare questions to ask',
  'Discuss with parents what to observe',
  'Confirm meeting time and place',
  'Keep backup plan if meeting goes wrong',
] as const;

export const MEETING_QUESTIONS = [
  'What does a typical day look like for you?',
  'Where do you see yourself in 5 years?',
  "What's your relationship with your siblings like?",
  'How do you handle disagreements?',
  'What are your expectations from marriage?',
  'How do you feel about working after marriage?',
  'What role does religion play in your daily life?',
  'How often do you want to visit family after marriage?',
  "What's your take on finances — joint or separate?",
  'Do you have any health conditions I should know about?',
  'What are your hobbies outside work?',
  'How do you feel about pets?',
  'What kind of wedding do you envision?',
  'Have you been in a relationship before?',
  'What made you say yes to meeting me?',
] as const;

export const GUT_FEELING_OPTIONS = [
  { emoji: '💚', label: 'Yes — I want to move forward' },
  { emoji: '🟡', label: 'Maybe — Need more time' },
  { emoji: '🔴', label: 'No — I don\'t see this working' },
] as const;

export const POST_MEETING_DIMENSIONS = [
  { label: 'Appearance Match',          key: 'appearanceMatch',    low: 'Very different from photos',  high: 'Exactly as expected' },
  { label: 'Conversation Quality',      key: 'convQuality',        low: 'Awkward / Dead silence',      high: 'Great chemistry' },
  { label: 'Connection Felt',           key: 'connectionFelt',     low: 'No connection',               high: 'Strong spark' },
  { label: 'Family Impression',         key: 'familyImpression',   low: 'Did not like',                high: 'Loved them' },
  { label: 'Financial Stability',       key: 'financialStability', low: 'Unclear / Concerning',        high: 'Very stable & transparent' },
  { label: 'Social Skills',             key: 'socialSkills',       low: 'Awkward / Shy',               high: 'Confident & charming' },
  { label: 'Friend Circle & Lifestyle', key: 'friendLifestyle',    low: 'No social life',              high: 'Great social circle' },
  { label: 'Family Values & Preferences', key: 'familyValues',     low: 'Very different from yours',   high: 'Perfectly aligned' },
  { label: 'Emotional Maturity',        key: 'emotionalMaturity',  low: 'Immature / Reactive',         high: 'Very mature & composed' },
  { label: 'Communication Style',       key: 'communicationStyle', low: 'Poor communicator',           high: 'Excellent communicator' },
] as const;

export type MeetingDimensionKey =
  | 'appearanceMatch' | 'convQuality' | 'connectionFelt' | 'familyImpression'
  | 'financialStability' | 'socialSkills' | 'friendLifestyle' | 'familyValues'
  | 'emotionalMaturity' | 'communicationStyle';

export interface MeetingRecord {
  meetingNumber: number;
  appearanceMatch?: number;
  convQuality?: number;
  connectionFelt?: number;
  familyImpression?: number;
  financialStability?: number;
  socialSkills?: number;
  friendLifestyle?: number;
  familyValues?: number;
  emotionalMaturity?: number;
  communicationStyle?: number;
  gutFeeling?: string;
  notes?: string;
  savedAt?: number;
}

export interface MeetingData {
  id?: string;
  plannedDate?: string;
  location?: string;
  checkedItems: string[];
  questionsAsked: string[];
  customQuestions?: string[];
  meetings?: MeetingRecord[];
  updatedAt?: number;
}

// ── Feature: Activity Timeline ────────────────────────────────────────────────

export type ActivityType =
  | 'added' | 'stage_change' | 'conversation' | 'flag_green' | 'flag_red'
  | 'family_score' | 'meeting' | 'note' | 'kundli';

export interface ActivityEntry {
  id: string;
  prospectId: string;
  prospectName: string;
  type: ActivityType;
  summary: string;
  date: string;
  time: string;
  createdAt: number;
}

// ── Feature: Stage Prompts ────────────────────────────────────────────────────

export interface StagePromptData {
  tags?: string[];
  note?: string;
  rating1?: number;
  rating2?: number;
  date?: string;
  location?: string;
}

export const STAGE_PROMPT_CONFIG: Partial<Record<ProspectStage, {
  title: string;
  subtitle?: string;
  tagOptions?: string[];
  hasRating1?: { label: string };
  hasRating2?: { label: string };
  hasDate?: boolean;
  hasLocation?: boolean;
  tagRequired?: boolean;
}>> = {
  new: {
    title: "What's your first impression?",
    tagOptions: ['Looks promising', 'Need more info', 'Parents suggested', 'Not sure yet'],
  },
  photo_exchanged: {
    title: 'Rate their photos',
    hasRating1: { label: 'Photo Match Expectation' },
    hasRating2: { label: 'Overall Appearance' },
    tagOptions: ['Better than expected', 'As expected', 'Below expectations', 'Edited/Filtered photos'],
  },
  kundli_sent: {
    title: 'Kundli sent to whom?',
    tagOptions: ['Family Pandit', 'Online Service', 'Self-Checked'],
  },
  kundli_matched: {
    title: "Pandit's verdict?",
    tagOptions: ['Approved', 'Approved with remedies', 'Not recommended', 'Doshas found'],
  },
  family_call: {
    title: 'How did the family interaction go?',
    tagOptions: ['Families got along', 'Some concerns', 'Did not go well'],
  },
  meeting_fixed: {
    title: 'When and where is the meeting?',
    hasDate: true,
    hasLocation: true,
  },
  interested: {
    title: 'What are the next steps?',
    tagOptions: ['Roka discussion', 'Engagement planning', 'Need more meetings', 'Families to meet again'],
    hasDate: true,
  },
  on_hold: {
    title: 'Why is this on hold?',
    tagOptions: [
      'Waiting for their response', 'Comparing with others', 'Family needs time',
      'Financial discussions pending', 'Kundli concerns', 'Need more meetings', 'Personal reasons',
    ],
    tagRequired: true,
  },
  rejected: {
    title: 'Why did this close?',
    tagOptions: [
      "Kundli didn't match", 'They said no', 'I said no', 'Family said no',
      'Found someone better', 'Mutual decision', 'Ghosted/No response',
      'Lifestyle mismatch', 'Financial mismatch', 'Location issue', 'Age gap concern',
    ],
    tagRequired: true,
  },
};
