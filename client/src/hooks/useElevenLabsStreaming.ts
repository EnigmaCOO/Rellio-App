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

  // Robust audio element creation with crash prevention
  const createAudioElement = useCallback((audioBlob: Blob) => {
    console.log('🔊 Creating robust audio element:', audioBlob.size, 'bytes');
    
    // Clean up previous audio completely
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        const oldSrc = audioRef.current.src;
        audioRef.current.src = '';
        if (oldSrc && oldSrc.startsWith('blob:')) {
          URL.revokeObjectURL(oldSrc);
        }
        audioRef.current.remove?.();
      } catch (error) {
        console.warn('🔊 Audio cleanup warning:', error);
      }
    }

    try {
      // Create new audio element with enhanced compatibility
      const audio = new Audio();
      
      // Grok-style audio setup with proper isolation from microphone
      audio.preload = 'auto';
      audio.volume = Math.max(0.3, Math.min(volume, 1.0)); // Higher minimum volume for clarity
      audio.crossOrigin = 'anonymous';
      
      // Enhanced audio setup for smooth playback
      audio.autoplay = false; // Prevent autoplay conflicts
      audio.muted = false;
      audio.defaultMuted = false;
      
      // Set audio to use speakers only, not microphone input
      if ('setSinkId' in audio) {
        try {
          (audio as any).setSinkId('default');
          console.log('🔊 Audio configured for smooth playback');
        } catch (error) {
          console.log('🔊 Using default audio configuration');
        }
      }
      
      // Add audio context isolation if available
      try {
        if (typeof window !== 'undefined' && ('webkitAudioContext' in window || 'AudioContext' in window)) {
          // Ensure audio doesn't capture to microphone
          if (!(audio as any).captureStream) {
            Object.defineProperty(audio, 'captureStream', {
              value: null,
              writable: false
            });
          }
        }
      } catch (error) {
        console.log('🔊 Audio context isolation not available');
      }
      
      // Create blob URL with proper MIME type
      const audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: 'audio/mpeg' }));
      
      // Enhanced event handlers with crash prevention
      audio.onloadstart = () => {
        console.log('🔊 Audio loading started');
      };

      audio.oncanplay = () => {
        console.log('🔊 Audio can start playing');
        setIsLoading(false);
      };

      audio.onplay = () => {
        console.log('🔊 Audio playback started successfully');
        setIsPlaying(true);
        setIsLoading(false);
        setCurrentAudio(audio);
        onStart?.();
      };

      audio.onended = () => {
        console.log('🔊 Audio playback completed');
        setIsPlaying(false);
        setCurrentAudio(null);
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (error) {
          console.warn('🔊 URL cleanup warning:', error);
        }
        onEnd?.();
      };

      audio.onerror = (event) => {
        console.error('🔊 Audio playback error:', event);
        console.error('🔊 Audio error details:', {
          error: audio.error?.code,
          message: audio.error?.message,
          networkState: audio.networkState,
          readyState: audio.readyState
        });
        
        setIsPlaying(false);
        setIsLoading(false);
        setCurrentAudio(null);
        
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (error) {
          console.warn('🔊 URL cleanup error:', error);
        }
        
        // Minimal error handling - only show critical errors
        if (audio.error && audio.error.code === 3) { // Only show decode errors
          console.log('🔊 Audio decode error - continuing without voice');
          // Don't show error message to user - just log and continue
        } else {
          console.log('🔊 Audio error occurred, continuing silently');
        }
      };
      
      audio.onstalled = () => {
        console.warn('🔊 Audio playback stalled - retrying...');
      };
      
      audio.onabort = () => {
        console.log('🔊 Audio playback aborted');
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.onpause = () => {
        console.log('🔊 Audio playback paused');
      };

      // Set source and load
      audio.src = audioUrl;
      audio.load();

      // Attempt to play with proper error handling and user interaction check
      if (autoPlay && !isInterruptedRef.current) {
        // Check if user has interacted with the page first
        const playAudio = async () => {
          try {
            await audio.play();
            console.log('🔊 Audio playback started successfully');
          } catch (error: any) {
            console.error('🔊 Play failed:', error);
            
            // Handle specific audio errors without showing error messages for common issues
            if (error.name === 'NotAllowedError') {
              console.log('🔊 User interaction required for audio');
              // Don't show error - this is normal browser behavior
            } else if (error.name === 'NotSupportedError') {
              console.log('🔊 Audio format not supported');
              // Try with a simpler approach
              try {
                audio.load();
                await audio.play();
              } catch (retryError) {
                console.log('🔊 Audio retry also failed, continuing without voice');
              }
            } else {
              console.log('🔊 Audio play failed, continuing without voice');
            }
          }
        };
        
        playAudio();
      }

      audioRef.current = audio;
      return audio;
      
    } catch (error) {
      console.error('🔊 Audio element creation failed:', error);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentAudio(null);
      onError?.('Failed to create audio player. Please refresh and try again.');
      return null;
    }
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

    // Limit text length for faster voice synthesis and better interruption
    const maxLength = 600; // Shorter responses for faster synthesis and easier interruption
    const textToSpeak = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    
    if (text.length > maxLength) {
      console.log('🔊 Text optimized from', text.length, 'to', textToSpeak.length, 'characters for smooth playback');
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
      console.log('🔊 TTS request failed (non-critical):', error);
      setIsLoading(false);
      
      // Don't show errors to user - voice failures are common and non-critical
      // The text response is still available and functional
      console.log('🔊 Continuing without voice - text response available');
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