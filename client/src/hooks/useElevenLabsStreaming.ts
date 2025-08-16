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
      
      // Set audio properties for better compatibility and isolation
      audio.preload = 'auto';
      audio.volume = Math.max(0.1, Math.min(volume, 1.0)); // Ensure valid volume range
      audio.crossOrigin = 'anonymous'; // Prevent CORS issues
      
      // Add audio isolation attributes to prevent microphone feedback
      if ('setSinkId' in audio) {
        // Try to use default output device
        try {
          (audio as any).setSinkId('default');
        } catch (error) {
          console.log('🔊 setSinkId not supported, using default audio output');
        }
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
        
        // Provide specific error messages based on error type
        if (audio.error) {
          const errorCode = audio.error.code;
          let errorMessage = 'Audio playback failed. ';
          
          switch (errorCode) {
            case 1: // MEDIA_ERR_ABORTED
              errorMessage += 'Playback was interrupted.';
              break;
            case 2: // MEDIA_ERR_NETWORK
              errorMessage += 'Network error occurred.';
              break;
            case 3: // MEDIA_ERR_DECODE
              errorMessage += 'Audio format issue.';
              break;
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
              errorMessage += 'Audio format not supported.';
              break;
            default:
              errorMessage += 'Please try again.';
          }
          
          onError?.(errorMessage);
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

      // Attempt to play with proper error handling
      if (autoPlay && !isInterruptedRef.current) {
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('🔊 Audio started playing successfully');
            })
            .catch(error => {
              console.error('🔊 Play promise failed:', error);
              if (error.name === 'NotAllowedError') {
                onError?.('Please click to enable audio playback.');
              } else if (error.name === 'NotSupportedError') {
                onError?.('Audio format not supported by browser.');
              } else {
                onError?.('Failed to start audio. Please try again.');
              }
            });
        }
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

    // Limit text length to prevent crashes with huge responses
    const maxLength = 2000; // Increased limit - the system is working well now
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
      console.error('🔊 Grok-style TTS error:', error);
      setIsLoading(false);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          onError?.('Voice request timed out. Let\'s try that again!');
        } else if (error.message.includes('Failed to fetch')) {
          onError?.('Connection issue. Check your network and try again.');
        } else if (error.message.includes('format') || error.message.includes('audio')) {
          onError?.('Audio generation failed. Trying again should work!');
        } else {
          // Don't show generic errors for successful operations
          console.warn('🔊 Non-critical error:', error.message);
        }
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