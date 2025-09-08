import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import OpenAI from 'openai';

interface VoiceRequest {
  type: 'tts_request' | 'chat_request';
  text: string;
  voice_id?: string;
  persona?: string;
  sessionId: string;
  context?: any;
}

interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  isActive: boolean;
}

export class VoiceWebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private openai: OpenAI;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/voice',
      perMessageDeflate: false, // Disable compression for lower latency
      host: '0.0.0.0' // Ensure it binds to all interfaces in Replit
    });
    
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.setupWebSocketHandlers();
    
    console.log('🔊 Voice WebSocket server initialized on /ws/voice');
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`🎤 Voice client connected: ${sessionId}`);
      
      const client: ClientConnection = {
        ws,
        sessionId,
        isActive: true
      };
      
      this.clients.set(sessionId, client);
      
      // Send connection confirmation
      this.sendToClient(sessionId, {
        type: 'connection_established',
        sessionId,
        latency: Date.now()
      });

      ws.on('message', async (data) => {
        try {
          const message: VoiceRequest = JSON.parse(data.toString());
          await this.handleVoiceRequest(sessionId, message);
        } catch (error: any) {
          console.error('Voice WebSocket message error:', error);
          this.sendError(sessionId, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`🎤 Voice client disconnected: ${sessionId}`);
        this.clients.delete(sessionId);
      });

      ws.on('error', (error) => {
        console.error(`Voice WebSocket error for ${sessionId}:`, error);
        this.clients.delete(sessionId);
      });
    });
  }

  private async handleVoiceRequest(sessionId: string, request: VoiceRequest) {
    const startTime = Date.now();
    
    try {
      if (request.type === 'tts_request') {
        await this.handleTTSRequest(sessionId, request, startTime);
      } else if (request.type === 'chat_request') {
        await this.handleChatRequest(sessionId, request, startTime);
      }
    } catch (error: any) {
      console.error('Voice request error:', error);
      this.sendError(sessionId, `Failed to process ${request.type}: ${error.message}`);
    }
  }

  private async handleTTSRequest(sessionId: string, request: VoiceRequest, startTime: number) {
    try {
      // First try ElevenLabs streaming
      const elevenLabsResponse = await this.streamElevenLabsAudio(
        request.text, 
        request.voice_id || 'pNInz6obpgDQGcFmaJgB', // Default Adam voice
        sessionId
      );
      
      if (elevenLabsResponse) {
        const latency = Date.now() - startTime;
        this.sendToClient(sessionId, {
          type: 'latency_info',
          latency,
          provider: 'elevenlabs'
        });
        return;
      }
      
      // Fallback to OpenAI TTS if ElevenLabs fails
      console.log('ElevenLabs failed, falling back to OpenAI TTS...');
      await this.handleOpenAITTS(sessionId, request, startTime);
      
    } catch (error: any) {
      console.error('TTS request failed:', error);
      this.sendError(sessionId, `TTS failed: ${error.message}`);
    }
  }

  private async streamElevenLabsAudio(text: string, voiceId: string, sessionId: string): Promise<boolean> {
    if (!process.env.ELEVENLABS_API_KEY) {
      console.log('ElevenLabs API key not found, skipping...');
      return false;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2_5', // Fastest model
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.8,
              style: 0.2,
              use_speaker_boost: true
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      // Stream audio chunks to client
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        this.sendToClient(sessionId, {
          type: 'audio_chunk',
          chunk: Array.from(value), // Convert Uint8Array to regular array for JSON
          isLast: false
        });
      }
      
      // Send end marker
      this.sendToClient(sessionId, {
        type: 'audio_chunk',
        chunk: [],
        isLast: true
      });

      return true;

    } catch (error) {
      console.error('ElevenLabs streaming error:', error);
      return false;
    }
  }

  private async handleOpenAITTS(sessionId: string, request: VoiceRequest, startTime: number) {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1-hd', // Use HD model for better quality
        voice: this.mapVoiceIdToOpenAI(request.voice_id),
        input: request.text,
        speed: 1.0
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      // Send as single chunk for OpenAI TTS (not streaming)
      this.sendToClient(sessionId, {
        type: 'audio_chunk',
        chunk: Array.from(buffer),
        isLast: true
      });

      const latency = Date.now() - startTime;
      this.sendToClient(sessionId, {
        type: 'latency_info',
        latency,
        provider: 'openai'
      });

    } catch (error: any) {
      throw new Error(`OpenAI TTS failed: ${error.message}`);
    }
  }

  private async handleChatRequest(sessionId: string, request: VoiceRequest, startTime: number) {
    try {
      // Stream chat completion from OpenAI
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Latest model for best performance
        messages: [
          {
            role: 'system',
            content: this.getPersonaSystemPrompt(request.persona, request.context)
          },
          {
            role: 'user',
            content: request.text
          }
        ],
        stream: true,
        max_tokens: 500, // Limit for voice responses
        temperature: 0.7
      });

      let fullResponse = '';
      let firstChunkTime: number | null = null;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          if (!firstChunkTime) {
            firstChunkTime = Date.now();
            this.sendToClient(sessionId, {
              type: 'latency_info',
              latency: firstChunkTime - startTime,
              provider: 'openai_chat'
            });
          }
          
          fullResponse += content;
          
          // Send streaming text chunk
          this.sendToClient(sessionId, {
            type: 'chat_chunk',
            content,
            isComplete: false
          });
        }
      }

      // Send completion marker
      this.sendToClient(sessionId, {
        type: 'chat_chunk',
        content: '',
        isComplete: true,
        fullResponse
      });

      // Auto-convert to speech if requested
      if (fullResponse.trim()) {
        await this.handleTTSRequest(sessionId, {
          ...request,
          type: 'tts_request',
          text: fullResponse
        }, Date.now());
      }

    } catch (error: any) {
      throw new Error(`Chat request failed: ${error.message}`);
    }
  }

  private getPersonaSystemPrompt(persona?: string, context?: any): string {
    const basePrompt = "You are a wise spiritual guide helping someone understand sacred texts.";
    
    if (!persona) return basePrompt;
    
    const personaPrompts: { [key: string]: string } = {
      'Christian Priest': 'You are a warm, pastoral Christian priest with deep theological knowledge. Speak with compassion and wisdom, drawing from biblical teachings.',
      'Islamic Mufti': 'You are an authoritative Islamic scholar (Mufti) with expertise in Quranic interpretation and Islamic jurisprudence. Provide thoughtful, scholarly responses.',
      'Hadith Scholar': 'You are a specialized Islamic scholar focused on Hadith sciences. Share authentic prophetic traditions with proper context and interpretation.',
      'Jewish Rabbi': 'You are a learned Jewish rabbi with deep knowledge of Torah and Talmudic teachings. Offer wisdom rooted in Jewish scholarship and tradition.',
      'Hindu Guru': 'You are a wise Hindu guru well-versed in Sanskrit scriptures, Vedanta, and spiritual philosophy. Guide with ancient wisdom and practical insights.',
      'Buddhist Monk': 'You are a serene Buddhist monk with deep understanding of Buddhist teachings and meditation practices. Share wisdom with mindfulness and compassion.',
      'Universal Scholar': 'You are a universal spiritual scholar with knowledge across all religious traditions. Provide balanced, interfaith wisdom that honors all paths.'
    };
    
    return personaPrompts[persona] || basePrompt;
  }

  private mapVoiceIdToOpenAI(voiceId?: string): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
    // Map ElevenLabs voice IDs to OpenAI voices
    const voiceMap: { [key: string]: any } = {
      'pNInz6obpgDQGcFmaJgB': 'alloy', // Adam
      'EXAVITQu4vr4xnSDxMaL': 'nova',  // Bella 
      'VR6AewLTigWG4xSOukaG': 'onyx',  // Antoni
      'oWAxZDx7w5VEj9dCyTzz': 'echo',  // Grace
      'cjVigY5qzO86Huf0OWal': 'fable', // Freya
    };
    
    return voiceMap[voiceId || ''] || 'alloy';
  }

  private sendToClient(sessionId: string, data: any) {
    const client = this.clients.get(sessionId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error(`Failed to send to client ${sessionId}:`, error);
        this.clients.delete(sessionId);
      }
    }
  }

  private sendError(sessionId: string, message: string) {
    this.sendToClient(sessionId, {
      type: 'error',
      message
    });
  }

  // Broadcast to all connected clients
  broadcast(data: any) {
    this.clients.forEach((client, sessionId) => {
      if (client.isActive) {
        this.sendToClient(sessionId, data);
      }
    });
  }

  // Get connected client count
  getClientCount(): number {
    return Array.from(this.clients.values()).filter(client => client.isActive).length;
  }
}