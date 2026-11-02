import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TraditionAnchor {
  reference: string;
  text: string;
  context: string;
}

export interface TraditionComparison {
  faith: string;
  insight: string;
  anchor: TraditionAnchor;
}

export interface StructuredComparisonResult {
  theme: string;
  faiths: string[];
  summary: string;
  traditions: TraditionComparison[];
  similarities: string[];
  differences: string[];
  keyThemes: string[];
}

export interface CompareRequest {
  theme: string;
  faiths: string[];
  verseContext?: {
    faith: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
  };
}

const TRADITION_DISPLAY: Record<string, string> = {
  christianity: 'Christianity',
  islam: 'Islam',
  judaism: 'Judaism',
  hinduism: 'Hinduism',
  buddhism: 'Buddhism',
  shintoism: 'Shintoism',
  sikhism: 'Sikhism',
};

export async function runStructuredComparison(req: CompareRequest): Promise<StructuredComparisonResult> {
  const traditionNames = req.faiths.map(f => TRADITION_DISPLAY[f.toLowerCase()] || f);

  const verseBlock = req.verseContext
    ? `\nThe user is currently reading ${req.verseContext.book} ${req.verseContext.chapter}:${req.verseContext.verse} (${req.verseContext.faith}): "${req.verseContext.text}". Use this as an anchor for the ${req.verseContext.faith} tradition where possible.`
    : '';

  const systemPrompt = `You are an interfaith scholar specialising in comparative religious studies. Respond only with valid JSON — no markdown, no preamble. Be accurate, reverent, and scholarly. Include real citations from sacred texts.`;

  const userPrompt = `Compare the theme of "${req.theme}" across these traditions: ${traditionNames.join(', ')}.${verseBlock}

Return a JSON object with exactly this shape:
{
  "summary": "<2-3 sentence neutral overview of how this theme appears across the traditions>",
  "traditions": [
    {
      "faith": "<tradition name>",
      "insight": "<2-3 sentence key teaching from this tradition on the theme>",
      "anchor": {
        "reference": "<Book Chapter:Verse or Surah/Hadith reference>",
        "text": "<exact or close quote from the sacred text>",
        "context": "<1-2 sentence explanation of why this anchor is relevant>"
      }
    }
  ],
  "similarities": ["<shared truth 1>", "<shared truth 2>", "<shared truth 3>"],
  "differences": ["<notable distinction 1>", "<notable distinction 2>"],
  "keyThemes": ["<theme word 1>", "<theme word 2>", "<theme word 3>"]
}

Provide exactly one entry in "traditions" per tradition requested, in the same order. "similarities" should have 2-4 items. "differences" should have 1-3 items. "keyThemes" should have 2-4 single words or short phrases.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0].message.content || '{}';
  const parsed = JSON.parse(raw) as Omit<StructuredComparisonResult, 'theme' | 'faiths'>;

  return {
    theme: req.theme,
    faiths: req.faiths,
    summary: parsed.summary || '',
    traditions: parsed.traditions || [],
    similarities: parsed.similarities || [],
    differences: parsed.differences || [],
    keyThemes: parsed.keyThemes || [],
  };
}
