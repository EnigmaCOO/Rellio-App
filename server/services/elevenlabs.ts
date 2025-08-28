import fetch from 'node-fetch';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  gender?: string;
  age?: string;
  accent?: string;
  description?: string;
  use_case?: string;
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private quotaCache: { remaining: number; lastChecked: number } | null = null;
  private activeRequests: Map<string, Promise<Buffer>> = new Map(); // Request deduplication

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
    console.log('ElevenLabs API key loaded:', this.apiKey ? `${this.apiKey.substring(0, 6)}...` : 'NOT FOUND');
  }

  // Check available quota before making requests
  async getQuotaInfo(): Promise<{ remaining: number; total: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check quota: ${response.status}`);
      }

      const data = await response.json() as any;
      // ElevenLabs API returns characters used, not remaining
      const used = data.subscription?.character_count || 0;
      const total = data.subscription?.character_limit || 100000;
      const remaining = Math.max(0, total - used);
      
      // Cache quota info for 1 minute
      this.quotaCache = { remaining, lastChecked: Date.now() };
      
      console.log(`💳 ElevenLabs quota - Remaining: ${remaining}, Total: ${total}`);
      return { remaining, total };
    } catch (error) {
      console.error('Error checking ElevenLabs quota:', error);
      // Return cached data if available
      if (this.quotaCache && (Date.now() - this.quotaCache.lastChecked) < 5 * 60 * 1000) {
        return { remaining: this.quotaCache.remaining, total: 100000 };
      }
      throw error;
    }
  }

  // Split text into chunks that fit within quota
  private splitTextIntoChunks(text: string, maxLength: number = 500): string[] {
    if (text.length <= maxLength) return [text];
    
    const chunks: string[] = [];
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
    
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    
    // If chunks are still too long, force split
    const finalChunks: string[] = [];
    for (const chunk of chunks) {
      if (chunk.length <= maxLength) {
        finalChunks.push(chunk);
      } else {
        const words = chunk.split(' ');
        let subChunk = '';
        for (const word of words) {
          if (subChunk.length + word.length + 1 <= maxLength) {
            subChunk += (subChunk ? ' ' : '') + word;
          } else {
            if (subChunk.trim()) finalChunks.push(subChunk.trim());
            subChunk = word;
          }
        }
        if (subChunk.trim()) finalChunks.push(subChunk.trim());
      }
    }
    
    return finalChunks;
  }

  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        
        if (response.status === 401) {
          throw new Error('Invalid ElevenLabs API key or insufficient permissions');
        }
        
        if (errorData.detail?.message) {
          throw new Error(`ElevenLabs API: ${errorData.detail.message}`);
        }
        
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json() as { voices: any[] };
      
      return data.voices.map(voice => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category || 'general',
        gender: voice.labels?.gender,
        age: voice.labels?.age,
        accent: voice.labels?.accent,
        description: voice.labels?.description,
        use_case: voice.labels?.use_case,
      }));
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, voiceId: string, options: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  } = {}): Promise<Buffer> {
    // Create a request key for deduplication
    const requestKey = `${voiceId}_${text.substring(0, 100)}`;
    
    // Check if this exact request is already in progress
    if (this.activeRequests.has(requestKey)) {
      console.log('🔄 Deduplicating concurrent request for:', text.substring(0, 50));
      return this.activeRequests.get(requestKey)!;
    }
    
    // Create the request promise
    const requestPromise = this._generateSpeechInternal(text, voiceId, options);
    
    // Store it in active requests
    this.activeRequests.set(requestKey, requestPromise);
    
    // Clean up when done
    requestPromise.finally(() => {
      this.activeRequests.delete(requestKey);
    });
    
    return requestPromise;
  }

  private async _generateSpeechInternal(text: string, voiceId: string, options: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  } = {}): Promise<Buffer> {
    try {
      const {
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0.0,
        useSpeakerBoost = true,
      } = options;

      console.log(`🔊 ElevenLabs TTS request: { textLength: ${text.length}, voiceId: '${voiceId}' }`);

      // Check quota before processing
      try {
        const quotaInfo = await this.getQuotaInfo();
        if (quotaInfo.remaining < text.length) {
          console.warn(`⚠️ Insufficient quota: ${quotaInfo.remaining} remaining, ${text.length} required`);
          
          // Calculate safe chunk size based on remaining quota
          const safeChunkSize = Math.min(Math.floor(quotaInfo.remaining * 0.8), 350);
          if (safeChunkSize < 50) {
            throw new Error(`ElevenLabs quota insufficient: ${quotaInfo.remaining} characters remaining`);
          }
          
          console.log(`📝 Splitting text into chunks of ${safeChunkSize} characters`);
          const chunks = this.splitTextIntoChunks(text, safeChunkSize);
          
          // Process only the first chunk to conserve quota
          if (chunks.length > 0) {
            console.log(`🎯 Processing first chunk (${chunks[0].length} chars): "${chunks[0].substring(0, 50)}..."`);
            text = chunks[0];
            
            if (chunks.length > 1) {
              console.warn(`⚠️ Truncated message to fit quota. ${chunks.length - 1} chunks omitted.`);
            }
          }
        }
      } catch (quotaError) {
        console.warn('Could not check quota, proceeding with original text:', quotaError);
        // If we can't check quota, try with a smaller chunk
        if (text.length > 400) {
          const chunks = this.splitTextIntoChunks(text, 400);
          text = chunks[0];
          console.log(`🎯 Using first chunk due to quota check failure: "${text.substring(0, 50)}..."`);
        }
      }

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('ElevenLabs TTS error details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        // Handle quota exceeded specifically
        if (response.status === 401 && errorText.includes('quota_exceeded')) {
          // Extract actual quota from error message
          const quotaMatch = errorText.match(/"message":"[^"]*(\d+)[^"]*remaining[^"]*(\d+)[^"]*required"/);
          if (quotaMatch) {
            const actualRemaining = parseInt(quotaMatch[1]);
            console.warn(`🚨 Real quota from TTS error: ${actualRemaining} remaining`);
            // Update cache with actual quota
            this.quotaCache = { remaining: actualRemaining, lastChecked: Date.now() };
          } else {
            // Clear quota cache to force fresh check next time
            this.quotaCache = null;
          }
          throw new Error(`ElevenLabs quota exceeded: Only ${quotaMatch?.[1] || 'few'} characters remaining`);
        }
        
        throw new Error(`ElevenLabs TTS error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ ElevenLabs TTS successful: ${text.length} characters processed`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  // Get recommended male voices for scripture reading
  getRecommendedMaleVoices(voices: ElevenLabsVoice[]): ElevenLabsVoice[] {
    const maleVoices = voices.filter(voice => 
      voice.gender?.toLowerCase() === 'male'
    ).sort((a, b) => {
      // Prioritize voices with good characteristics for scripture reading
      const aScore = this.getVoiceScore(a);
      const bScore = this.getVoiceScore(b);
      return bScore - aScore;
    });
    
    console.log(`Found ${maleVoices.length} male voices:`, maleVoices.map(v => `${v.name} (${v.use_case})`));
    return maleVoices;
  }

  private getVoiceScore(voice: ElevenLabsVoice): number {
    let score = 0;
    
    // Prefer professional category
    if (voice.category === 'professional') score += 10;
    if (voice.category === 'premade') score += 8;
    
    // Prefer mature voices for religious content
    if (voice.age === 'middle_aged' || voice.age === 'old') score += 5;
    if (voice.age === 'young') score += 2;
    
    // Prefer clear, warm voices
    if (voice.description?.includes('clear')) score += 3;
    if (voice.description?.includes('warm')) score += 3;
    if (voice.description?.includes('deep')) score += 2;
    
    // Prefer educational/informative/narrative use cases for scripture
    if (voice.use_case?.includes('narration')) score += 8;
    if (voice.use_case?.includes('informative_educational')) score += 7;
    if (voice.use_case?.includes('conversational')) score += 5;
    if (voice.use_case?.includes('narrative_story')) score += 6;
    if (voice.use_case?.includes('audiobook')) score += 4;
    
    // Prefer British/American accents for clarity
    if (voice.accent === 'american' || voice.accent === 'british') score += 3;
    
    return score;
  }
}