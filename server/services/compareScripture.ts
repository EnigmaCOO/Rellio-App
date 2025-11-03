
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ComparisonRequest {
  theme: string;
  faiths: string[];
  verses?: Array<{
    faith: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
}

interface ComparisonResult {
  theme: string;
  comparisons: Array<{
    faith: string;
    verse: string;
    insight: string;
  }>;
  synthesis: string;
  sharedWisdom: string[];
}

export async function compareScriptures(request: ComparisonRequest): Promise<ComparisonResult> {
  try {
    const prompt = buildComparisonPrompt(request);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an interfaith scholar expert in comparative religious studies. 
          Analyze scripture passages with respect, accuracy, and scholarly rigor.
          Highlight both unique insights and shared wisdom across traditions.
          Always maintain reverence for sacred texts.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const analysis = response.choices[0].message.content || '';
    return parseComparisonResponse(analysis, request);
    
  } catch (error) {
    console.error('Scripture comparison error:', error);
    throw new Error('Failed to compare scriptures');
  }
}

function buildComparisonPrompt(request: ComparisonRequest): string {
  let prompt = `Compare perspectives on the theme: "${request.theme}"\n\n`;
  
  if (request.verses && request.verses.length > 0) {
    prompt += 'Analyze these specific verses:\n\n';
    request.verses.forEach(verse => {
      prompt += `${verse.faith} - ${verse.book} ${verse.chapter}:${verse.verse}\n`;
      prompt += `"${verse.text}"\n\n`;
    });
  } else {
    prompt += `Compare perspectives from these traditions: ${request.faiths.join(', ')}\n\n`;
  }
  
  prompt += `Provide:
1. Key insights from each tradition
2. Common themes and shared wisdom
3. Unique perspectives each tradition offers
4. A synthesis that honors all viewpoints`;
  
  return prompt;
}

function parseComparisonResponse(analysis: string, request: ComparisonRequest): ComparisonResult {
  // Parse the AI response into structured format
  return {
    theme: request.theme,
    comparisons: request.verses?.map(v => ({
      faith: v.faith,
      verse: `${v.book} ${v.chapter}:${v.verse}`,
      insight: analysis // Simplified - would extract per-faith insights in production
    })) || [],
    synthesis: analysis,
    sharedWisdom: extractSharedWisdom(analysis)
  };
}

function extractSharedWisdom(analysis: string): string[] {
  // Extract common themes (simplified implementation)
  const commonThemes = [];
  if (analysis.toLowerCase().includes('compassion')) commonThemes.push('Compassion');
  if (analysis.toLowerCase().includes('justice')) commonThemes.push('Justice');
  if (analysis.toLowerCase().includes('wisdom')) commonThemes.push('Wisdom');
  if (analysis.toLowerCase().includes('faith')) commonThemes.push('Faith');
  
  return commonThemes;
}

export async function streamComparisonAnalysis(
  request: ComparisonRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  const prompt = buildComparisonPrompt(request);
  
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an interfaith scholar expert in comparative religious studies.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 1500
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      onChunk(content);
    }
  }
}
