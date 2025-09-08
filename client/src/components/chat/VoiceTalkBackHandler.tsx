import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ScholarPersona } from './ScholarPersonas';

interface VoiceTalkBackHandlerProps {
  message: string;
  persona: ScholarPersona;
  onPlaybackStart: () => void;
  onPlaybackEnd: () => void;
  onInterruption: (interruptedAt: number, context: string) => void;
  onError: (error: string) => void;
  volume: number;
  shouldAutoPlay: boolean;
  sessionId: string;
  context: {
    religion: string | null;
    book: string;
    chapter: number;
    verseReference?: { book: string; chapter: number; verse: number };
  };
  isTalkingBack: boolean;
  setIsTalkingBack: (talking: boolean) => void;
}

export const VoiceTalkBackHandler = React.memo(({
  message,
  persona,
  onPlaybackStart,
  onPlaybackEnd,
  onInterruption,
  onError,
  volume,
  shouldAutoPlay,
  sessionId,
  context,
  isTalkingBack,
  setIsTalkingBack
}: VoiceTalkBackHandlerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackStartTime = useRef<number | null>(null);
  const interruptionDetection = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const { toast } = useToast();

  // WebSocket for low-latency streaming
  const setupWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Fix for undefined port issue - ensure we have a proper host with port
    const host = window.location.host || 'localhost:5000';
    const wsUrl = `${protocol}//${host}/ws/voice`;
    
    try {
      console.log('🔊 Attempting WebSocket connection to:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('🔊 Voice WebSocket connected for real-time streaming');
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'audio_chunk') {
          // Handle streaming audio chunks
          const audioBlob = new Blob([new Uint8Array(data.chunk)], { type: 'audio/mp3' });
          audioChunksRef.current.push(audioBlob);
          
          // Start playback as soon as we have enough chunks
          if (!isPlaying && audioChunksRef.current.length > 2) {
            playStreamingAudio();
          }
        } else if (data.type === 'latency_info') {
          setResponseLatency(data.latency);
        } else if (data.type === 'error') {
          onError(`WebSocket error: ${data.message}`);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('Voice WebSocket error:', error);
        console.log('🔊 WebSocket failed, falling back to HTTP streaming');
        // Fallback to HTTP streaming
        fallbackToHttpStreaming();
      };
      
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
      console.log('🔊 WebSocket setup failed, using HTTP streaming instead');
      fallbackToHttpStreaming();
    }
  }, [isPlaying, onError]);

  // Fallback HTTP streaming for ElevenLabs
  const fallbackToHttpStreaming = useCallback(async () => {
    if (!message.trim()) return;
    
    setIsBuffering(true);
    setIsTalkingBack(true);
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/elevenlabs/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          voice_id: persona.elevenLabsVoice,
          model_id: "eleven_turbo_v2_5", // Fastest model for low latency
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          },
          output_format: "mp3_22050_32"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      setResponseLatency(Date.now() - startTime);
      
      // Create audio URL and play
      const audioUrl = URL.createObjectURL(audioBlob);
      playAudioUrl(audioUrl);
      
    } catch (error) {
      console.error('ElevenLabs streaming error:', error);
      setResponseLatency(Date.now() - startTime);
      // Fallback to browser speech synthesis
      fallbackToBrowserSpeech();
    } finally {
      setIsBuffering(false);
    }
  }, [message, persona.elevenLabsVoice, setIsTalkingBack]);

  // Play streaming audio chunks
  const playStreamingAudio = useCallback(() => {
    if (audioChunksRef.current.length === 0) return;
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    playAudioUrl(audioUrl);
    
    // Clear chunks for next message
    audioChunksRef.current = [];
  }, []);

  // Play audio from URL
  const playAudioUrl = useCallback((audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }
    
    audioRef.current = new Audio(audioUrl);
    audioRef.current.volume = volume;
    audioRef.current.preload = 'metadata';
    
    audioRef.current.onloadstart = () => setIsBuffering(true);
    audioRef.current.oncanplay = () => setIsBuffering(false);
    
    audioRef.current.onplay = () => {
      setIsPlaying(true);
      setIsTalkingBack(true);
      playbackStartTime.current = Date.now();
      onPlaybackStart();
      startInterruptionDetection();
    };
    
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setIsTalkingBack(false);
      setPlaybackProgress(0);
      onPlaybackEnd();
      stopInterruptionDetection();
      URL.revokeObjectURL(audioUrl);
      savePlaybackData();
    };
    
    audioRef.current.onerror = () => {
      setIsPlaying(false);
      setIsTalkingBack(false);
      setIsBuffering(false);
      onError('Audio playback failed');
      fallbackToBrowserSpeech();
    };

    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setPlaybackProgress(progress);
      }
    };
    
    // Start playback
    audioRef.current.play().catch(error => {
      console.error('Audio play failed:', error);
      fallbackToBrowserSpeech();
    });
  }, [volume, onPlaybackStart, onPlaybackEnd, onError, setIsTalkingBack]);

  // Fallback to browser speech synthesis
  const fallbackToBrowserSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      
      // Apply persona voice characteristics
      utterance.rate = persona.voiceTone.includes('calm') ? 0.9 : 1.0;
      utterance.pitch = persona.voiceTone.includes('warm') ? 1.1 : 1.0;
      utterance.volume = volume;
      
      utterance.onstart = () => {
        setIsPlaying(true);
        setIsTalkingBack(true);
        onPlaybackStart();
        startInterruptionDetection();
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        setIsTalkingBack(false);
        onPlaybackEnd();
        stopInterruptionDetection();
        savePlaybackData();
      };
      
      utterance.onerror = (error) => {
        setIsPlaying(false);
        setIsTalkingBack(false);
        onError(`Speech synthesis error: ${error.error}`);
      };
      
      speechSynthesis.speak(utterance);
    } else {
      onError('No audio playback method available');
    }
  }, [message, persona.voiceTone, volume, onPlaybackStart, onPlaybackEnd, onError, setIsTalkingBack]);

  // Interruption detection with ambient listening
  const startInterruptionDetection = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('🎤 Interruption detection active');
      };
      
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        if (transcript.trim().length > 3) { // Ignore very short sounds
          const interruptedAt = Date.now() - (playbackStartTime.current || Date.now());
          handleInterruption(interruptedAt, transcript);
        }
      };
      
      recognition.onerror = (error: any) => {
        console.log('Interruption detection error:', error.error);
      };
      
      recognition.start();
      mediaRecorderRef.current = recognition as any;
      
    } catch (error) {
      console.error('Failed to start interruption detection:', error);
    }
  }, []);

  // Handle user interruption
  const handleInterruption = useCallback((interruptedAt: number, transcript: string) => {
    console.log(`🚨 Interruption detected at ${interruptedAt}ms: "${transcript}"`);
    
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    speechSynthesis.cancel();
    
    // Flash interruption indicator
    const element = document.querySelector('.voice-orb');
    if (element) {
      element.classList.add('flash-interruption');
      setTimeout(() => element.classList.remove('flash-interruption'), 500);
    }
    
    setIsPlaying(false);
    setIsTalkingBack(false);
    stopInterruptionDetection();
    
    // Notify parent with interruption context
    onInterruption(interruptedAt, transcript);
    
    // Save interruption data
    saveInterruptionData(interruptedAt, transcript);
    
  }, [onInterruption, setIsTalkingBack]);

  // Stop interruption detection
  const stopInterruptionDetection = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        (mediaRecorderRef.current as any).stop();
      } catch (error) {
        console.log('Error stopping interruption detection:', error);
      }
      mediaRecorderRef.current = null;
    }
    
    if (interruptionDetection.current) {
      clearTimeout(interruptionDetection.current);
      interruptionDetection.current = null;
    }
  }, []);

  // Save playback data to database
  const savePlaybackData = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await fetch('/api/chat/voice-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          voiceData: {
            persona: persona.name,
            elevenLabsVoice: persona.elevenLabsVoice,
            voiceTone: persona.voiceTone,
            responseLatency,
            playbackDuration: playbackStartTime.current ? Date.now() - playbackStartTime.current : null
          },
          verseReference: context.verseReference,
          context: context
        })
      });
    } catch (error) {
      console.error('Failed to save playback data:', error);
    }
  }, [sessionId, persona, responseLatency, context]);

  // Save interruption data
  const saveInterruptionData = useCallback(async (interruptedAt: number, transcript: string) => {
    if (!sessionId) return;
    
    try {
      await fetch('/api/chat/interruption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          interruptionData: {
            interruptedAt,
            transcript,
            context: message.substring(0, Math.floor(message.length * (interruptedAt / 100))),
            persona: persona.name
          },
          isInterrupted: true,
          context: context
        })
      });
    } catch (error) {
      console.error('Failed to save interruption data:', error);
    }
  }, [sessionId, message, persona.name, context]);

  // Auto-play effect
  useEffect(() => {
    if (shouldAutoPlay && message.trim() && !isPlaying && !isTalkingBack) {
      // Setup WebSocket and start streaming
      setupWebSocket();
      
      // Small delay to allow WebSocket connection
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Send message via WebSocket for streaming
          wsRef.current.send(JSON.stringify({
            type: 'tts_request',
            text: message,
            voice_id: persona.elevenLabsVoice,
            persona: persona.name,
            sessionId
          }));
        } else {
          // Fallback to HTTP streaming
          fallbackToHttpStreaming();
        }
      }, 100);
    }
  }, [message, shouldAutoPlay, isPlaying, isTalkingBack, setupWebSocket, fallbackToHttpStreaming, persona, sessionId]);

  // Volume change effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      speechSynthesis.cancel();
      stopInterruptionDetection();
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stopInterruptionDetection]);

  return (
    <div className="voice-talkback-handler">
      {/* Visual feedback */}
      {isPlaying && (
        <div className="flex items-center space-x-2 text-xs text-blue-600">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>{persona.name} is speaking...</span>
          {responseLatency && (
            <span className="text-gray-500">({responseLatency}ms)</span>
          )}
        </div>
      )}
      
      {isBuffering && (
        <div className="flex items-center space-x-2 text-xs text-orange-600">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-spin" />
          <span>Generating voice response...</span>
        </div>
      )}
      
      {/* Progress indicator */}
      {isPlaying && (
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
          <div 
            className="h-full bg-blue-500 transition-all duration-100 ease-out"
            style={{ width: `${playbackProgress}%` }}
          />
        </div>
      )}
    </div>
  );
});

VoiceTalkBackHandler.displayName = 'VoiceTalkBackHandler';