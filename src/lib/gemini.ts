import { GoogleGenAI, Type } from '@google/genai';

export interface AiConfig {
  provider: 'gemini' | 'openai-compatible';
  apiKey: string;
  baseUrl?: string;
  model: string;
}

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

async function callGemini(prompt: string, config: AiConfig, responseSchema?: any) {
  const client = new GoogleGenAI({ apiKey: config.apiKey });
  
  const response = await client.models.generateContent({
    model: config.model || DEFAULT_GEMINI_MODEL,
    contents: prompt,
    config: responseSchema ? {
      responseMimeType: 'application/json',
      responseSchema: responseSchema
    } : undefined
  });

  return response.text;
}

async function callOpenAiCompatible(prompt: string, config: AiConfig, responseFormat?: any) {
  const baseUrl = (config.baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  // OpenRouter specific headers
  if (url.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Academic Reference Verifier';
  }

  const body: any = {
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = `AI API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch (e) {
      // Not JSON
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

export async function testAiConnection(config: AiConfig): Promise<boolean> {
  try {
    const prompt = "Respond with only the word 'OK'.";
    let result: string | undefined;
    if (config.provider === 'gemini') {
      result = await callGemini(prompt, config);
    } else {
      result = await callOpenAiCompatible(prompt, config);
    }
    return !!result && result.toUpperCase().includes('OK');
  } catch (error) {
    console.error('AI Connection Test Failed:', error);
    throw error;
  }
}

export async function parseReference(rawReference: string, aiConfig?: AiConfig) {
  // Use provided config or fallback to env vars (Gemini)
  const config: AiConfig = aiConfig || {
    provider: 'gemini',
    apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '',
    model: DEFAULT_GEMINI_MODEL
  };

  if (!config.apiKey) {
    throw new Error('AI API Key is required. Please configure it in settings.');
  }

  const prompt = `You are a structured bibliographic metadata extractor.

Your task is to extract bibliographic metadata from a raw reference string.

Return JSON only.
Do not use markdown.
Do not wrap the response in code fences.
Do not include explanations.
Do not infer unsupported facts.
Do not fabricate missing values.

If a field cannot be determined, return null.
If authors cannot be reliably determined, return an empty array.

Input reference:
${rawReference}

Return this exact JSON schema:
{
  "raw_reference": string,
  "title": string | null,
  "authors": string[],
  "year": number | null,
  "journal_or_book": string | null,
  "volume": string | null,
  "issue": string | null,
  "pages": string | null,
  "doi": string | null,
  "url": string | null,
  "type_hint": "journal_article" | "conference_paper" | "book" | "other" | "unknown",
  "language_hint": "western" | "non_western" | "unknown"
}

Rules:
1. Extract only what is explicitly supported by the reference string.
2. Do not guess DOI, pages, issue, or journal if not present.
3. Preserve the original raw reference exactly.
4. The title should be plain text only.
5. type_hint must be one of: "journal_article", "conference_paper", "book", "other", "unknown".
   - Use "book" for books or monographs.
   - Use "journal_article" for standard journal papers.
   - Use "conference_paper" for papers from conferences/proceedings.
6. language_hint must be one of: "western", "non_western", "unknown".
   - Use "western" for English, French, German, Spanish, etc.
   - Use "non_western" for Chinese, Japanese, Korean, Arabic, etc.
7. Output valid JSON only.`;

  let text: string | undefined;
  if (config.provider === 'gemini') {
    const schema = {
      type: Type.OBJECT,
      properties: {
        raw_reference: { type: Type.STRING },
        title: { type: Type.STRING, nullable: true },
        authors: { type: Type.ARRAY, items: { type: Type.STRING } },
        year: { type: Type.INTEGER, nullable: true },
        journal_or_book: { type: Type.STRING, nullable: true },
        volume: { type: Type.STRING, nullable: true },
        issue: { type: Type.STRING, nullable: true },
        pages: { type: Type.STRING, nullable: true },
        doi: { type: Type.STRING, nullable: true },
        url: { type: Type.STRING, nullable: true },
        type_hint: { 
          type: Type.STRING, 
          enum: ["journal_article", "conference_paper", "book", "other", "unknown"]
        },
        language_hint: {
          type: Type.STRING,
          enum: ["western", "non_western", "unknown"]
        }
      },
      required: ['raw_reference', 'authors', 'type_hint', 'language_hint']
    };
    text = await callGemini(prompt, config, schema);
  } else {
    try {
      text = await callOpenAiCompatible(prompt, config, { type: 'json_object' });
    } catch (e) {
      console.warn('JSON mode failed, falling back to plain text prompt', e);
      const jsonPrompt = `${prompt}\n\nReturn ONLY a JSON object with the following fields: raw_reference, title, authors (array), year (int), journal_or_book, volume, issue, pages, doi, url, type_hint, language_hint.`;
      text = await callOpenAiCompatible(jsonPrompt, config);
    }
  }

  if (!text) {
    throw new Error('Failed to parse reference: No text returned');
  }

  try {
    // Clean up potential markdown code blocks if not using strict JSON mode
    const cleaned = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('JSON Parse Error. Raw text:', text);
    throw new Error('Failed to parse reference: Invalid JSON response from AI');
  }
}

export async function generateExplanation(parsed: any, match: any, aiConfig?: AiConfig): Promise<string> {
  const config: AiConfig = aiConfig || {
    provider: 'gemini',
    apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '',
    model: DEFAULT_GEMINI_MODEL
  };

  if (!config.apiKey) {
    return 'AI API Key not configured. Cannot generate explanation.';
  }

  const prompt = `
You are a strict, conservative academic reference verification assistant. Your ONLY job is to explain the results of a deterministic matching process between a user-provided reference and external scholarly metadata APIs.

Provide your explanation in BOTH English and Traditional Chinese (繁體中文).
Format:
English: [English Explanation]
中文說明：[中文說明]

User's Parsed Reference:
${JSON.stringify(parsed, null, 2)}

Best Match from External APIs (Source: ${match.bestCandidate?.source || 'None'}):
${JSON.stringify(match.bestCandidate || {}, null, 2)}

Match Category: ${match.category}
Confidence Score: ${match.score}
Matched Fields: ${match.matchedFields.join(', ')}
Mismatched Fields: ${match.mismatchedFields.join(', ')}

CRITICAL CONSTRAINTS:
1. NEVER invent or hallucinate information.
2. DO NOT use your internal knowledge to decide if a reference exists. You MUST rely ONLY on the "Best Match from External APIs" provided above.
3. If the Match Category is 'not_verified':
   - If "Best Match from External APIs" is empty/null, state clearly that the reference was "not found" in any queried database.
   - If a candidate was found but the score was too low, state that it is "not verified" because the candidate did not match the parsed reference sufficiently.
4. If the category is 'confirmed', state that the reference was found and matches the external database.
5. If the category is 'likely_exists_but_citation_incorrect', point out the specific discrepancies (e.g., wrong year, misspelled author) based on the mismatched fields.
6. If the category is 'possible_near_match', explain why it's a weak match and what conflicts exist.
7. Keep each language's explanation under 2 sentences. Be direct and objective.
8. ALWAYS provide both English and Chinese versions regardless of the input.
`;

  try {
    if (config.provider === 'gemini') {
      return await callGemini(prompt, config);
    } else {
      return await callOpenAiCompatible(prompt, config);
    }
  } catch (error) {
    console.error('Explanation generation error:', error);
    return 'Failed to generate explanation due to an error.';
  }
}
