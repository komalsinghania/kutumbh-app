import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
import { verifyFirebaseIdToken } from '@/lib/verify-firebase-token';
import { isRateLimited } from '@/lib/rate-limit';

// ── Abuse controls ───────────────────────────────────────────────────────────
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;   // 8 MB hard cap on any uploaded file
const MAX_TEXT_CHARS = 60_000;              // pasted/extracted text ceiling
const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // legacy .doc (rejected later with a friendly message)
]);

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME = 'application/msword';

function isWord(file: File) {
  const name = (file.name || '').toLowerCase();
  return (
    file.type === DOCX_MIME ||
    file.type === DOC_MIME ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  );
}

const EXTRACTION_PROMPT = `You are extracting information from an Indian matrimonial biodata document. Return ONLY a valid JSON object — no markdown, no explanation, no extra text. Use null for any field not found.

JSON schema:
{
  "name": string,
  "age": number,
  "gender": string,
  "city": string,
  "height": string,
  "education": string,
  "profession": string,
  "income": string,
  "familyType": string,
  "diet": string,
  "dobDate": string,
  "dobTime": string,
  "dobPlace": string,
  "rashi": string,
  "nakshatra": string,
  "gotra": string,
  "manglik": string,
  "fatherOcc": string,
  "motherOcc": string,
  "siblings": string,
  "property": string,
  "phone": string,
  "hobbies": string[]
}

═══ KUNDLI FIELDS — read this section carefully ═══

── dobDate ──
Output format: YYYY-MM-DD (always convert to this format).
Labels to look for: "Date of Birth", "DOB", "D.O.B", "D.O.B.", "जन्म तिथि", "Born", "Birth Date".
Examples:
  "DOB: 23-07-1994" → "1994-07-23"
  "Date of Birth: 15 Mar 1996" → "1996-03-15"
  "Born: 5th April 1995" → "1995-04-05"
  "जन्म तिथि: 10/06/1993" → "1993-06-10"
  "Date of Birth: 23-07-1994; 02:43 AM (Howrah, West Bengal)" → dobDate: "1994-07-23"

── dobTime ──
Output format: HH:MM in 24-hour clock (e.g. "02:43", "22:30"). Strip AM/PM and convert.
Labels to look for: "Time of Birth", "Birth Time", "Time", "समय", "जन्म समय".
Examples:
  "02:43 AM" → "02:43"
  "10:30 PM" → "22:30"
  "11:15 PM" → "23:15"
  "2:43 AM" → "02:43"

── dobPlace ──
Output format: Just the city name only (no state, no country).
Labels to look for: "Place of Birth", "Birth Place", "Place", "स्थान", "जन्म स्थान", or city name in parentheses after the time.
Examples:
  "(Howrah, West Bengal)" → "Howrah"
  "Place: Jaipur, Rajasthan" → "Jaipur"
  "Date of Birth: 23-07-1994; 02:43 AM (Howrah, West Bengal)" → dobPlace: "Howrah"

── Combined DOB line examples ──
  "Date of Birth: 23-07-1994; 02:43 AM (Howrah, West Bengal)"
    → dobDate: "1994-07-23", dobTime: "02:43", dobPlace: "Howrah"
  "DOB: 15 Mar 1996, Time: 10:30 PM, Place: Jaipur"
    → dobDate: "1996-03-15", dobTime: "22:30", dobPlace: "Jaipur"
  "D.O.B: 5th April 1995 | Time of Birth: 11:15 PM | Place: Mumbai"
    → dobDate: "1995-04-05", dobTime: "23:15", dobPlace: "Mumbai"

── gotra ──
Labels: "Gotra", "Gotra (Nana)", "गोत्र".
If format is "Bansal (Nana: Gupta)" — take only "Bansal".
Examples: "Gotra: Singhal" → "Singhal"

── rashi ──
Labels: "Rashi", "Raashi", "Moon Sign", "राशि", "Janma Rashi".
Output the Indian name as-is: "Mesh", "Vrishabh", "Mithun", "Kark", "Simha", "Kanya", "Tula", "Vrishchik", "Dhanu", "Makar", "Kumbh", "Meen".

── nakshatra ──
Labels: "Nakshatra", "Birth Star", "Janma Nakshatra", "नक्षत्र".
Output the nakshatra name as-is.

── manglik ──
Normalise to one of: "Yes", "No", "Partial".
"Non-Manglik" / "Not Manglik" → "No"
"Partial Manglik" / "Anshik Manglik" → "Partial"

═══ OTHER FIELDS ═══
hobbies: Array of short strings. Labels: "Hobbies", "Interests", "Likes", "Hobbies & Interests", "शौक", "रुचि".
  Split a sentence into individual items and Title-Case each.
  Examples:
    "Reading, travelling and listening to music" → ["Reading", "Travelling", "Listening to music"]
    "Hobbies: Cricket, Gym, Movies" → ["Cricket", "Gym", "Movies"]
  Return null (not []) if no hobbies are mentioned.
familyType: "Joint" or "Nuclear"
diet: "Pure Veg", "Jain", "Eggetarian", or "Non-Veg"
income: output as a range string like "10-20" or "35-50" (in LPA). If exact figure given, convert to nearest range.
height: output in feet-inches format like "5'6\\"
gender: "Male" or "Female"`;

export async function POST(req: NextRequest) {
  // ── 1. Authenticate: must be a signed-in user of THIS Firebase project ──────
  const uid = await verifyFirebaseIdToken(req.headers.get('authorization'));
  if (!uid) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // ── 2. Throttle per user (durable via Upstash, in-memory fallback) ─────────
  if (await isRateLimited(uid)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute and try again.' },
      { status: 429 },
    );
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'AI extraction is not configured.' }, { status: 503 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const contentType = req.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let messageContent: Anthropic.MessageParam['content'];

    if (isJson) {
      // ── JSON body: { text } or { image, mimeType } ─────────────────────────
      const body = await req.json();

      if (body.image && body.mimeType) {
        // Base64 image sent as JSON
        const allowedImg = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
        if (!allowedImg.has(body.mimeType)) {
          return NextResponse.json({ error: 'Unsupported image type.' }, { status: 415 });
        }
        // base64 inflates ~33%; cap the decoded size at MAX_UPLOAD_BYTES.
        if (typeof body.image !== 'string' || body.image.length > MAX_UPLOAD_BYTES * 1.4) {
          return NextResponse.json({ error: 'Image too large.' }, { status: 413 });
        }
        const mimeType = body.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        messageContent = [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: body.image } },
        ];
      } else if (body.text) {
        // Plain text biodata pasted by user
        if (typeof body.text !== 'string' || body.text.length > MAX_TEXT_CHARS) {
          return NextResponse.json({ error: 'Text is too long.' }, { status: 413 });
        }
        messageContent = [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'text', text: `Biodata text to extract from:\n\n${body.text}` },
        ];
      } else {
        return NextResponse.json({ error: 'JSON body must contain "text" or "image" + "mimeType"' }, { status: 400 });
      }

    } else {
      // ── Multipart form data: file upload (PDF or image) ────────────────────
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Reject oversized or disallowed files before reading them into memory.
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: 'File is too large (max 8 MB).' }, { status: 413 });
      }
      const declaredType = file.type || '';
      const nameOk = isWord(file) || /\.(jpe?g|png|gif|webp|pdf|docx?)$/i.test(file.name || '');
      if (declaredType && !ALLOWED_UPLOAD_MIME.has(declaredType) && !nameOk) {
        return NextResponse.json({ error: 'Unsupported file type.' }, { status: 415 });
      }

      const bytes = await file.arrayBuffer();

      if (isWord(file)) {
        const buffer = Buffer.from(bytes);
        let text: string;
        try {
          const result = await mammoth.extractRawText({ buffer });
          text = (result.value || '').trim();
        } catch (err: any) {
          const name = (file.name || '').toLowerCase();
          const isLegacyDoc = file.type === DOC_MIME || (name.endsWith('.doc') && !name.endsWith('.docx'));
          const message = isLegacyDoc
            ? 'Legacy .doc files are not supported. Please save the biodata as .docx, PDF, or image and try again.'
            : `Could not read Word document: ${err?.message || 'unknown error'}`;
          return NextResponse.json({ error: message }, { status: 422 });
        }

        if (!text) {
          return NextResponse.json({ error: 'Word document appears to be empty.' }, { status: 422 });
        }

        if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS);
        messageContent = [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'text', text: `Biodata text to extract from:\n\n${text}` },
        ];
      } else {
        const base64 = Buffer.from(bytes).toString('base64');
        const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';
        const isPdf = mimeType === 'application/pdf';

        if (isPdf) {
          messageContent = [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as any,
          ];
        } else {
          messageContent = [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image', source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
          ];
        }
      }
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: messageContent }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[extract-biodata] No JSON found in response');
      return NextResponse.json({ error: 'Could not parse extracted data' }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ data: extracted });

  } catch (err: any) {
    // Log only non-sensitive diagnostics server-side; never echo internals to the client.
    console.error('[extract-biodata] Error:', err?.name, '| status:', err?.status);
    const status = typeof err?.status === 'number' ? err.status : 500;
    const safeMessage = status === 429
      ? 'The AI service is busy. Please try again shortly.'
      : 'Extraction failed. Please try again.';
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
