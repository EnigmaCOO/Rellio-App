import OpenAI from 'openai';
import type { PersonaId } from './personas';
import { getPersona } from './personas';

export interface AIConfig {
  xaiApiKey?: string;
  openaiApiKey?: string;
  maxTokens?: number;
  disableFallback?: boolean;
}

export interface AIRequest {
  message: string;
  persona: PersonaId;
  context?: {
    religion?: string;
    book?: string;
    chapter?: number;
    verses?: Array<{ verse: number; text: string }>;
  };
  sessionHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AIResponse {
  response: string;
  provider: 'grok' | 'openai' | 'fallback';
  latency: number;
  tokensUsed?: number;
}

export class AIAdapter {
  private xaiClient?: OpenAI;
  private openaiClient?: OpenAI;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;

    if (config.xaiApiKey) {
      this.xaiClient = new OpenAI({
        apiKey: config.xaiApiKey,
        baseURL: 'https://api.x.ai/v1',
      });
    }

    if (config.openaiApiKey) {
      this.openaiClient = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }
  }

  async ask(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    const persona = getPersona(request.persona);
    const messages = this.buildMessages(request, persona.systemPrompt);

    try {
      if (this.xaiClient) {
        const response = await this.callGrok(messages);
        return {
          response,
          provider: 'grok',
          latency: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.error('Grok API error:', error);
      if (this.config.disableFallback) {
        throw new Error('AI service unavailable');
      }
    }

    try {
      if (this.openaiClient) {
        const response = await this.callOpenAI(messages);
        return {
          response,
          provider: 'openai',
          latency: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
    }

    return {
      response: "I apologize, but I'm currently unable to connect to the AI service. Please try again in a moment.",
      provider: 'fallback',
      latency: Date.now() - startTime,
    };
  }

  private buildMessages(request: AIRequest, systemPrompt: string) {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (request.context) {
      let contextInfo = '';
      if (request.context.religion) {
        contextInfo += `Religion: ${request.context.religion}\n`;
      }
      if (request.context.book) {
        contextInfo += `Book: ${request.context.book}\n`;
      }
      if (request.context.chapter) {
        contextInfo += `Chapter: ${request.context.chapter}\n`;
      }
      if (request.context.verses && request.context.verses.length > 0) {
        contextInfo += '\nVerses for context:\n';
        request.context.verses.forEach(v => {
          contextInfo += `${v.verse}. ${v.text}\n`;
        });
      }
      
      if (contextInfo) {
        messages.push({
          role: 'system',
          content: `Current Scripture Context:\n${contextInfo}`,
        });
      }
    }

    if (request.sessionHistory && request.sessionHistory.length > 0) {
      const recentHistory = request.sessionHistory.slice(-10);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      });
    }

    messages.push({
      role: 'user',
      content: request.message,
    });

    return messages;
  }

  private async callGrok(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!this.xaiClient) {
      throw new Error('Grok client not initialized');
    }

    const response = await this.xaiClient.chat.completions.create({
      model: 'grok-2',
      messages,
      max_tokens: this.config.maxTokens || 2000,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }

  private async callOpenAI(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: this.config.maxTokens || 2000,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }
}

let sharedAdapter: AIAdapter | null = null;

export function getAIAdapter(config?: AIConfig): AIAdapter {
  if (!sharedAdapter || config) {
    sharedAdapter = new AIAdapter(config || {
      xaiApiKey: process.env.XAI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
      disableFallback: process.env.AI_DISABLE_FALLBACK === 'true',
    });
  }
  return sharedAdapter;
}
