import { useState, useEffect, useRef, useCallback } from 'react';

export interface ElevenLabsStreamingOptions {
  voiceId?: string;
  autoPlay?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onInterrupted?: () => void;
}

export interface ElevenLabsStreamingReturn {
  isPlaying: boolean;
  isLoading: boolean;
  currentAudio: HTMLAudioElement | null;
  playText: (text: string) => Promise<void>;
  stopPlayback: () => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  isSupported: boolean;
  volume: number;
  setVolume: (volume: number) => void;
}

// Enhanced voice personas for Grok-style personality
const DEFAULT_VOICES = {
  grok: 'ErXwobaYiN019PkySvjV', // Antoni - friendly, engaging, perfect for Grok
  mystic: 'EXAVITQu4vr4xnSDxMaL', // Bella - warm, calming female voice
  scholar: 'pNInz6obpgDQGcFmaJgB', // Adam - clear, professional male voice
  sage: 'VR6AewLTigWG4xSOukaG', // Arnold - deep, authoritative male voice
  guide: 'ErXwobaYiN019PkySvjV', // Antoni - friendly, engaging male voice
};

export function useElevenLabsStreaming(options: ElevenLabsStreamingOptions = {}): ElevenLabsStreamingReturn {
  const {
    voiceId = DEFAULT_VOICES.grok, // Default to Grok voice for personality
    autoPlay = true,
    onStart,
    onEnd,
    onError,
    onInterrupted
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [volume, setVolume] = useState(0.8);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInterruptedRef = useRef(false);

  // Check browser support
  useEffect(() => {
    setIsSupported('Audio' in window && 'fetch' in window);
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Simplified audio element creation
  const createAudioElement = useCallback((audioBlob: Blob) => {
    console.log('🔊 Creating simple audio element:', audioBlob.size, 'bytes');
    
    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // Create audio element with blob URL
    const audio = new Audio();
    const audioUrl = URL.createObjectURL(audioBlob);
    audio.src = audioUrl;
    audio.volume = volume;

    // Basic event listeners
    audio.onplay = () => {
      console.log('🔊 Audio started playing');
      setIsPlaying(true);
      setIsLoading(false);
      setCurrentAudio(audio);
      onStart?.();
    };

    audio.onended = () => {
      console.log('🔊 Audio finished');
      setIsPlaying(false);
      setCurrentAudio(null);
      URL.revokeObjectURL(audioUrl);
      onEnd?.();
    };

    audio.onerror = (error) => {
      console.error('🔊 Audio error:', error);
      console.error('🔊 Audio error details:', {
        error: audio.error,
        networkState: audio.networkState,
        readyState: audio.readyState,
        src: audio.src
      });
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentAudio(null);
      URL.revokeObjectURL(audioUrl);
      onError?.('Audio crashed during playback. The response might be too long.');
    };
    
    // Add additional error handling for crashes
    audio.onstalled = () => {
      console.warn('🔊 Audio stalled');
    };
    
    audio.onabort = () => {
      console.warn('🔊 Audio aborted');
      setIsPlaying(false);
      setIsLoading(false);
    };

    // Try to play immediately
    if (autoPlay && !isInterruptedRef.current) {
      audio.play().catch(error => {
        console.error('🔊 Play failed:', error);
        onError?.('Could not start audio. Please click to enable sound.');
      });
    }

    audioRef.current = audio;
    return audio;
  }, [volume, autoPlay, onStart, onEnd, onError]);

  // Main function to convert text to speech and play with enhanced error handling
  const playText = useCallback(async (text: string): Promise<void> => {
    if (!isSupported) {
      onError?.('Audio not supported in this browser');
      return;
    }

    if (!text.trim()) {
      onError?.('No text provided');
      return;
    }

    // Limit text length to prevent crashes with huge responses
    const maxLength = 1500; // Reasonable limit for audio generation
    const textToSpeak = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    
    if (text.length > maxLength) {
      console.log('🔊 Text truncated from', text.length, 'to', textToSpeak.length, 'characters');
    }

    console.log('🔊 Starting Grok-style TTS for:', textToSpeak.substring(0, 50) + '...', 'with enhanced personality settings');
    
    try {
      setIsLoading(true);
      isInterruptedRef.current = false;

      // Enhanced API call with timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSpeak.trim(),
          voiceId,
          options: {
            stability: 0.3, // Even more dynamic for Grok-style personality
            similarityBoost: 0.9, // Higher consistency for clear personality
            style: 0.4, // More personality injection for engaging delivery
            useSpeakerBoost: true,
            optimizeStreamingLatency: 3 // Faster response for conversational feel
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Enhanced response validation
      const contentType = response.headers.get('content-type');
      console.log('🔊 Response details:', {
        status: response.status,
        contentType,
        contentLength: response.headers.get('content-length')
      });
      
      if (!contentType || !contentType.includes('audio/')) {
        const errorText = await response.text();
        console.error('🔊 Invalid response received:', errorText.substring(0, 200));
        throw new Error(`Expected audio, got: ${contentType}`);
      }

      // Get audio data as array buffer for better control
      const arrayBuffer = await response.arrayBuffer();
      console.log('🔊 Audio data received:', arrayBuffer.byteLength, 'bytes');
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Empty audio data received');
      }

      // Simple audio blob creation - no complex fallbacks
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      console.log('🔊 Created simple audio blob:', audioBlob.size, 'bytes');

      // Simple audio element creation
      if (!isInterruptedRef.current) {
        createAudioElement(audioBlob);
      } else {
        console.log('🔊 Playback was interrupted, skipping audio creation');
        setIsLoading(false);
      }

    } catch (error) {
      console.error('🔊 Grok-style TTS error:', error);
      setIsLoading(false);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          onError?.('Voice request timed out. No worries - let\'s try that again!');
        } else if (error.message.includes('Failed to fetch')) {
          onError?.('Network hiccup detected! Check your connection and we\'ll get right back to chatting.');
        } else if (error.message.includes('format')) {
          onError?.('Audio format issue. Please try again.');
        } else {
          onError?.(error.message || 'Voice generation hit a snag. Let\'s try again!');
        }
      } else {
        onError?.('Voice generation hit an unexpected snag. No worries - let\'s try again!');
      }
    }
  }, [isSupported, voiceId, createAudioElement, onError]);

  // Enhanced stop playback with immediate response
  const stopPlayback = useCallback(() => {
    console.log('🔊 Interruption detected - stopping Grok immediately');
    isInterruptedRef.current = true;
    
    // Immediate state updates for responsive feel
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentAudio(null);
    
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        
        // Clean up audio URL
        const oldSrc = audioRef.current.src;
        audioRef.current.src = '';
        if (oldSrc && oldSrc.startsWith('blob:')) {
          URL.revokeObjectURL(oldSrc);
        }
      } catch (error) {
        console.warn('🔊 Audio cleanup error (non-critical):', error);
      }
    }
    
    onInterrupted?.();
  }, [onInterrupted]);

  // Pause current playback
  const pausePlayback = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      console.log('🔊 Pausing playback');
      audioRef.current.pause();
    }
  }, []);

  // Resume paused playback
  const resumePlayback = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      console.log('🔊 Resuming playback');
      audioRef.current.play().catch(error => {
        console.error('🔊 Resume play failed:', error);
        onError?.('Failed to resume playback');
      });
    }
  }, [onError]);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return {
    isPlaying,
    isLoading,
    currentAudio,
    playText,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    isSupported,
    volume,
    setVolume
  };
}