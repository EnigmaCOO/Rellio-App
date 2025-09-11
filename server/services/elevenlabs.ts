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
    console.log('🔐 ElevenLabs API key:', this.apiKey ? 'configured' : 'NOT FOUND');
  }

  // Check available quota before making requests with better error handling
  async getQuotaInfo(): Promise<{ remaining: number; total: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ ElevenLabs API key invalid or expired');
          // Return very low quota to trigger fallback
          return { remaining: 0, total: 0 };
        }
        throw new Error(`Failed to check quota: ${response.status}`);
      }

      const data = await response.json() as any;
      // ElevenLabs API returns characters used, not remaining
      const used = data.subscription?.character_count || 0;
      const total = data.subscription?.character_limit || 10000;
      const remaining = Math.max(0, total - used);
      
      // Cache quota info for 30 seconds for frequent checks
      this.quotaCache = { remaining, lastChecked: Date.now() };
      
      console.log(`💳 ElevenLabs quota - Used: ${used}, Remaining: ${remaining}, Total: ${total}`);
      return { remaining, total };
    } catch (error) {
      console.error('Error checking ElevenLabs quota:', error);
      // Return cached data if available and recent
      if (this.quotaCache && (Date.now() - this.quotaCache.lastChecked) < 2 * 60 * 1000) {
        console.log('📋 Using cached quota info');
        return { remaining: this.quotaCache.remaining, total: 10000 };
      }
      // Return minimal quota to allow some attempts
      console.log('🔄 Quota check failed, allowing limited attempts');
      return { remaining: 100, total: 10000 };
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
      // Return a new promise that handles its own errors to prevent uncaught exceptions
      return this.activeRequests.get(requestKey)!.catch(error => {
        // Re-throw the error so each caller can handle it independently
        throw error;
      });
    }
    
    // Create the request promise with proper error handling
    const requestPromise = this._generateSpeechInternal(text, voiceId, options).catch(error => {
      // Log the error but re-throw it for proper handling by callers
      console.error('❌ ElevenLabs TTS error in generateSpeech:', error);
      throw error;
    });
    
    // Store it in active requests
    this.activeRequests.set(requestKey, requestPromise);
    
    // Clean up when done - ensure cleanup doesn't throw
    requestPromise.finally(() => {
      try {
        this.activeRequests.delete(requestKey);
      } catch (cleanupError) {
        console.error('Error cleaning up ElevenLabs request:', cleanupError);
      }
    }).catch(() => {
      // Silently handle any remaining unhandled rejections from the cleanup
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

      // Check quota before processing with improved handling
      try {
        const quotaInfo = await this.getQuotaInfo();
        
        // If no quota available, fail immediately
        if (quotaInfo.remaining <= 0) {
          throw new Error('ElevenLabs quota depleted. Please check your account.');
        }
        
        // If text is longer than available quota, truncate smartly
        if (quotaInfo.remaining < text.length) {
          console.warn(`⚠️ Limited quota: ${quotaInfo.remaining} remaining, ${text.length} required`);
          
          // Use 80% of remaining quota to leave buffer
          const safeLength = Math.floor(quotaInfo.remaining * 0.8);
          
          if (safeLength < 50) {
            throw new Error(`ElevenLabs quota too low: ${quotaInfo.remaining} characters remaining`);
          }
          
          // Truncate at sentence boundaries if possible
          const truncated = text.substring(0, safeLength);
          const lastSentence = truncated.lastIndexOf('.');
          
          if (lastSentence > safeLength * 0.5) {
            text = truncated.substring(0, lastSentence + 1);
          } else {
            text = truncated;
          }
          
          console.log(`📝 Text truncated to ${text.length} characters to fit quota`);
        }
      } catch (quotaError) {
        console.warn('Quota check failed, using fallback limits:', quotaError);
        // Conservative fallback - limit to 300 characters
        if (text.length > 300) {
          text = text.substring(0, 300);
          console.log(`🎯 Fallback truncation to 300 characters: "${text.substring(0, 50)}..."`);
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