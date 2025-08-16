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

// Default voice IDs for different personas (you can expand this)
const DEFAULT_VOICES = {
  mystic: 'EXAVITQu4vr4xnSDxMaL', // Bella - warm, calming female voice
  scholar: 'pNInz6obpgDQGcFmaJgB', // Adam - clear, professional male voice
  sage: 'VR6AewLTigWG4xSOukaG', // Arnold - deep, authoritative male voice
  guide: 'ErXwobaYiN019PkySvjV', // Antoni - friendly, engaging male voice
};

export function useElevenLabsStreaming(options: ElevenLabsStreamingOptions = {}): ElevenLabsStreamingReturn {
  const {
    voiceId = DEFAULT_VOICES.scholar,
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
            const fallbackBlob = new Blob([audioBlob], { type: 'audio/mp3' });
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

  // Main function to convert text to speech and play
  const playText = useCallback(async (text: string): Promise<void> => {
    if (!isSupported) {
      onError?.('Audio not supported in this browser');
      return;
    }

    if (!text.trim()) {
      onError?.('No text provided');
      return;
    }

    console.log('🔊 Starting text-to-speech for:', text.substring(0, 50) + '...');
    
    try {
      setIsLoading(true);
      isInterruptedRef.current = false;

      // Call backend API to generate speech
      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          voiceId,
          options: {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Validate response content type
      const contentType = response.headers.get('content-type');
      console.log('🔊 Response content type:', contentType);
      
      if (!contentType || !contentType.includes('audio/')) {
        const responseText = await response.text();
        console.error('🔊 Non-audio response received:', responseText.substring(0, 200));
        throw new Error(`Invalid audio response. Expected audio format, got: ${contentType}. Response: ${responseText.substring(0, 100)}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();
      console.log('🔊 Audio blob received:', {
        size: audioBlob.size,
        type: audioBlob.type,
        contentType: contentType
      });
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio data');
      }

      // Always create a new blob with correct MIME type to ensure browser compatibility
      const correctedBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
      console.log('🔊 Corrected blob:', {
        size: correctedBlob.size,
        type: correctedBlob.type
      });

      // Create and setup audio element
      if (!isInterruptedRef.current) {
        createAudioElement(correctedBlob, false);
      } else {
        console.log('🔊 Playback was interrupted, skipping audio creation');
        setIsLoading(false);
      }

    } catch (error) {
      console.error('🔊 Text-to-speech error:', error);
      setIsLoading(false);
      onError?.(error instanceof Error ? error.message : 'Text-to-speech failed');
    }
  }, [isSupported, voiceId, createAudioElement, onError]);

  // Stop current playback immediately
  const stopPlayback = useCallback(() => {
    console.log('🔊 Stopping playback');
    isInterruptedRef.current = true;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Clean up audio URL
      const oldSrc = audioRef.current.src;
      audioRef.current.src = '';
      if (oldSrc && oldSrc.startsWith('blob:')) {
        URL.revokeObjectURL(oldSrc);
      }
    }
    
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentAudio(null);
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