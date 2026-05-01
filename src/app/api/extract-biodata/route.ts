import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';

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
  "phone": string
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
familyType: "Joint" or "Nuclear"
diet: "Pure Veg", "Jain", "Eggetarian", or "Non-Veg"
income: output as a range string like "10-20" or "35-50" (in LPA). If exact figure given, convert to nearest range.
height: output in feet-inches format like "5'6\\"
gender: "Male" or "Female"`;

export async function POST(req: NextRequest) {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  console.log('API key loaded:', apiKey ? `yes, length: ${apiKey.length}, prefix: ${apiKey.slice(0, 10)}` : 'NO KEY FOUND');

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
        const mimeType = body.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        console.log('[extract-biodata] JSON image received | mimeType:', mimeType, '| base64 length:', body.image?.length ?? 0);
        messageContent = [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: body.image } },
        ];
      } else if (body.text) {
        // Plain text biodata pasted by user
        console.log('[extract-biodata] JSON text received | length:', body.text.length);
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

      console.log('[extract-biodata] File received:', file.name, '| type:', file.type, '| size:', file.size, 'bytes');

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

        console.log('[extract-biodata] Word text extracted | length:', text.length);
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

    console.log('[extract-biodata] Calling Anthropic API | model: claude-sonnet-4-5');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: messageContent }],
    });

    console.log('[extract-biodata] stop_reason:', response.stop_reason, '| usage:', JSON.stringify(response.usage));

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[extract-biodata] Raw output:', text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[extract-biodata] No JSON found in response');
      return NextResponse.json({ error: 'Could not parse extracted data' }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    console.log('[extract-biodata] Extracted fields:', Object.keys(extracted).filter(k => extracted[k] !== null).join(', '));
    return NextResponse.json({ data: extracted });

  } catch (err: any) {
    console.error('[extract-biodata] Error:', err.name, '|', err.message, '| status:', err.status);
    console.error('[extract-biodata] Body:', JSON.stringify(err.error ?? err.body ?? null));
    return NextResponse.json(
      { error: err.message || 'Extraction failed' },
      { status: err.status ?? 500 }
    );
  }
}
