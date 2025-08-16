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

  // Create audio element with event handlers with retry mechanism
  const createAudioElement = useCallback((audioBlob: Blob, isRetry = false) => {
    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      const oldSrc = audioRef.current.src;
      audioRef.current.src = '';
      if (oldSrc && oldSrc.startsWith('blob:')) {
        URL.revokeObjectURL(oldSrc);
      }
    }

    console.log('🔊 Creating audio element for blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
    
    // Validate audio blob
    if (audioBlob.size === 0) {
      console.error('🔊 Empty audio blob received');
      onError?.('Empty audio response received');
      setIsLoading(false);
      return;
    }

    // Check browser audio support for the specific format
    const testAudio = new Audio();
    const canPlayMP3 = testAudio.canPlayType('audio/mpeg');
    const canPlayOGG = testAudio.canPlayType('audio/ogg');
    const canPlayWAV = testAudio.canPlayType('audio/wav');
    console.log('🔊 Browser audio support:', {
      mp3: canPlayMP3,
      ogg: canPlayOGG,
      wav: canPlayWAV,
      blobType: audioBlob.type
    });
    
    if (!canPlayMP3) {
      console.warn('🔊 Browser MP3 support limited:', canPlayMP3);
      // Don't fail here, let the browser try to play it anyway
    }

    const audio = new Audio();
    audio.setAttribute('controls', 'false'); // Explicitly set no controls
    audio.setAttribute('preload', 'auto');
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('🔊 Audio URL created:', audioUrl);
    
    audio.src = audioUrl;
    audio.volume = volume;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    // Set up event listeners
    audio.addEventListener('loadstart', () => {
      console.log('🔊 Audio loading started');
      setIsLoading(true);
    });

    audio.addEventListener('loadeddata', () => {
      console.log('🔊 Audio data loaded');
    });

    audio.addEventListener('canplay', () => {
      console.log('🔊 Audio can start playing - ready state:', audio.readyState);
      setIsLoading(false);
      if (autoPlay && !isInterruptedRef.current) {
        console.log('🔊 Starting auto-play');
        audio.play().catch(error => {
          console.error('🔊 Auto-play failed:', {
            error: error.message,
            name: error.name,
            readyState: audio.readyState,
            networkState: audio.networkState
          });
          setIsLoading(false);
          onError?.(`Auto-play blocked: ${error.message}. Click play button manually.`);
        });
      }
    });

    audio.addEventListener('canplaythrough', () => {
      console.log('🔊 Audio ready to play through');
      setIsLoading(false);
    });

    audio.addEventListener('play', () => {
      console.log('🔊 Audio playback started');
      setIsPlaying(true);
      setCurrentAudio(audio);
      setIsLoading(false);
      onStart?.();
    });

    audio.addEventListener('pause', () => {
      console.log('🔊 Audio playback paused');
      setIsPlaying(false);
    });

    audio.addEventListener('ended', () => {
      console.log('🔊 Audio playback ended');
      setIsPlaying(false);
      setCurrentAudio(null);
      URL.revokeObjectURL(audioUrl);
      onEnd?.();
    });

    audio.addEventListener('error', (event) => {
      const audioError = audio.error;
      console.error('🔊 Audio playback error details:', {
        event,
        audioError,
        errorCode: audioError?.code,
        audioSrc: audio.src,
        audioReadyState: audio.readyState,
        networkState: audio.networkState,
        blobSize: audioBlob.size,
        blobType: audioBlob.type
      });
      
      let errorMessage = 'Audio playback failed';
      let debugInfo = '';
      
      if (audioError) {
        switch (audioError.code) {
          case audioError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio playback was aborted';
            debugInfo = 'The audio was stopped before it finished loading.';
            break;
          case audioError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error during audio playback';
            debugInfo = 'Network issue while loading audio.';
            break;
          case audioError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error - invalid audio format';
            debugInfo = `Blob type: ${audioBlob.type}, Size: ${audioBlob.size} bytes`;
            break;
          case audioError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported by browser';
            debugInfo = `Browser cannot play ${audioBlob.type}. Browser MP3 support: ${canPlayMP3}`;
            break;
          default:
            errorMessage = `Audio error: ${audioError.message || 'Unknown error'}`;
            debugInfo = `Error code: ${audioError.code}`;
        }
      }
      
      console.error('🔊 Full error context:', { errorMessage, debugInfo });
      
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentAudio(null);
      URL.revokeObjectURL(audioUrl);
      
      // Try fallback approach on first failure
      if (!isRetry && audioError && audioError.code === audioError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        console.log('🔊 Retrying with different blob approach...');
        setTimeout(() => {
          try {
            // Try creating a new blob with different options
            const fallbackBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
            createAudioElement(fallbackBlob, true);
          } catch (retryError) {
            console.error('🔊 Retry failed:', retryError);
            onError?.(`${errorMessage}. ${debugInfo}`);
          }
        }, 100);
      } else {
        onError?.(`${errorMessage}. ${debugInfo}`);
      }
    });

    audio.addEventListener('stalled', () => {
      console.warn('🔊 Audio playback stalled');
    });

    audio.addEventListener('waiting', () => {
      console.log('🔊 Audio waiting for data');
    });

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

    console.log('🔊 Starting Grok-style TTS for:', text.substring(0, 50) + '...', 'with enhanced personality settings');
    
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
          text: text.trim(),
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

      // Create optimized audio blob with multiple format fallbacks
      let audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      
      // Verify blob can be processed
      if (audioBlob.size !== arrayBuffer.byteLength) {
        console.warn('🔊 Blob size mismatch, trying fallback');
        // Try alternative blob creation
        audioBlob = new Blob([new Uint8Array(arrayBuffer)], { type: 'audio/mp3' });
        console.log('🔊 Using fallback blob:', audioBlob.size, 'bytes');
      }

      // Create and setup audio element with enhanced error recovery
      if (!isInterruptedRef.current) {
        try {
          createAudioElement(audioBlob, false);
        } catch (createError) {
          console.warn('🔊 Primary audio creation failed, trying fallback:', createError);
          // Try with different blob type as fallback
          const fallbackBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
          createAudioElement(fallbackBlob, true);
        }
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
          onError?.('Audio format issue detected. Switching to compatibility mode...');
          // Try a simpler request without advanced options
          setTimeout(() => {
            playText(text.substring(0, 100)) // Retry with shorter text
              .catch(() => onError?.('Unable to generate voice. Please try again with shorter text.'));
          }, 1000);
          return;
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