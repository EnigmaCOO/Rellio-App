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

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
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
    try {
      const {
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0.0,
        useSpeakerBoost = true,
      } = options;

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
        throw new Error(`ElevenLabs TTS error: ${response.status}`);
      }

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