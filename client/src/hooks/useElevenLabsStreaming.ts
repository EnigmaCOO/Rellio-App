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
  const activeRequestRef = useRef<string | null>(null); // Track active requests to prevent duplicates

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

      audio.oncanplaythrough = () => {
        console.log('🔊 Audio can play through');
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

      // Attempt to play with proper error handling and race condition prevention
      if (autoPlay && !isInterruptedRef.current) {
        // Add a small delay to prevent race conditions with cleanup
        setTimeout(async () => {
          if (!isInterruptedRef.current && audio && !audio.paused) {
            try {
              console.log('🔊 Starting audio playback after delay...');
              const playPromise = audio.play();
              
              if (playPromise !== undefined) {
                await playPromise;
                console.log('🔊 Audio playback started successfully');
              }
            } catch (error: any) {
              console.error('🔊 Play failed:', error);

              // Handle specific audio errors without showing error messages for common issues
              if (error.name === 'NotAllowedError') {
                console.log('🔊 User interaction required for audio - user needs to click first');
                // Don't show error - this is normal browser behavior
              } else if (error.name === 'AbortError') {
                console.log('🔊 Audio was interrupted - this is normal during cleanup');
                // This happens during normal interruption, don't treat as error
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
          }
        }, 100); // Small delay to prevent race conditions
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

  // Clean text function to remove HTML/XML tags and perspective markers
  const cleanTextForSpeech = useCallback((text: string): string => {
    return text
      .replace(/<perspective>[^<]*<\/perspective>/gi, '') // Remove perspective tags and content
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML/XML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }, []);

  // Enhanced playText function with better ElevenLabs integration
  const playText = useCallback(async (text: string): Promise<void> => {
    if (!isSupported) {
      console.log('🔊 Audio not supported in this browser');
      return;
    }

    if (!text.trim()) {
      console.log('🔊 No text provided');
      return;
    }

    // Clean text first to remove perspective tags and HTML
    const cleanedText = cleanTextForSpeech(text);

    // Create request ID for deduplication
    const requestId = `${cleanedText.substring(0, 50)}_${voiceId}`;

    // Prevent duplicate requests
    if (activeRequestRef.current === requestId) {
      console.log('🚫 Duplicate request blocked:', requestId);
      return;
    }

    // Stop any existing audio and mark as active
    if (isPlaying || isLoading) {
      console.log('🛑 Stopping existing playback for new request');
      stopPlayback();
    }

    activeRequestRef.current = requestId;
    isInterruptedRef.current = false; // Reset interruption flag

    if (!cleanedText.trim()) {
      console.log('🔊 No readable text after cleaning');
      activeRequestRef.current = null;
      return;
    }

    // Limit text length for faster voice synthesis
    const maxLength = 500; // Shorter for faster synthesis
    const textToSpeak = cleanedText.length > maxLength ? cleanedText.substring(0, maxLength) + '...' : cleanedText;

    setIsLoading(true);

    try {
      console.log('🔊 Starting ElevenLabs TTS request for:', textToSpeak.substring(0, 50) + '...');
      console.log('🎙️ Using voice ID:', voiceId);

      if (isInterruptedRef.current) {
        console.log('🔊 Playback was interrupted, aborting');
        setIsLoading(false);
        activeRequestRef.current = null;
        return;
      }

      // Direct ElevenLabs API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSpeak,
          voiceId: voiceId,
          settings: {
            stability: 0.5,
            similarityBoost: 0.8,
            style: 0.0,
            useSpeakerBoost: true
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('🔊 ElevenLabs API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('🚨 ElevenLabs API error:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      if (isInterruptedRef.current) {
        console.log('🔊 Playback was interrupted after API call, aborting');
        setIsLoading(false);
        activeRequestRef.current = null;
        return;
      }

      console.log('🔊 Creating audio blob from response...');
      const audioBlob = await response.blob();
      console.log('🔊 Audio blob created, size:', audioBlob.size, 'bytes');

      if (audioBlob.size === 0) {
        throw new Error('Empty audio response from ElevenLabs');
      }

      if (isInterruptedRef.current) {
        console.log('🔊 Playback was interrupted, aborting');
        setIsLoading(false);
        activeRequestRef.current = null;
        return;
      }

      // Use the proper audio element creation function with all the setup
      console.log('🔊 Creating proper audio element for playback...');
      const audio = createAudioElement(audioBlob);
      
      if (!audio) {
        throw new Error('Failed to create audio element');
      }

      setCurrentAudio(audio);
      setIsLoading(false);
      console.log('🔊 Audio element created and ready for playback');

    } catch (error) {
      console.log('🔊 ElevenLabs failed, falling back to browser speech:', error);
      setIsLoading(false);
      activeRequestRef.current = null;

      // Enhanced browser speech synthesis fallback
      if ('speechSynthesis' in window && window.speechSynthesis && !isInterruptedRef.current) {
        try {
          console.log('🔊 Using browser speech synthesis fallback');

          // Clear any existing speech
          window.speechSynthesis.cancel();
          await new Promise(resolve => setTimeout(resolve, 100));

          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.volume = Math.min(volume, 1.0);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.lang = 'en-US';

          // Try to use a better voice if available
          const voices = window.speechSynthesis.getVoices();
          const englishVoice = voices.find(voice =>
            voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
          );
          if (englishVoice) {
            utterance.voice = englishVoice;
            console.log('🔊 Using enhanced voice:', englishVoice.name);
          }

          utterance.onstart = () => {
            console.log('🔊 Browser speech started');
            setIsPlaying(true);
            setIsLoading(false);
            onStart?.();
          };

          utterance.onend = () => {
            console.log('🔊 Browser speech completed');
            setIsPlaying(false);
            setCurrentAudio(null);
            activeRequestRef.current = null;
            onEnd?.();
          };

          utterance.onerror = (event) => {
            console.log('🔊 Browser speech error:', event.error);
            setIsPlaying(false);
            setIsLoading(false);
            setCurrentAudio(null);
            activeRequestRef.current = null;
            onEnd?.();
          };

          if (!isInterruptedRef.current) {
            window.speechSynthesis.speak(utterance);
          }

        } catch (fallbackError) {
          console.error('🔊 Browser speech synthesis failed:', fallbackError);
          setIsLoading(false);
          activeRequestRef.current = null;
          onEnd?.();
        }
      } else {
        console.log('🔊 No fallback speech available');
        onEnd?.();
      }
    }
  }, [isSupported, voiceId, volume, onStart, onEnd, cleanTextForSpeech]);

  // Enhanced stop playback with immediate response
  const stopPlayback = useCallback(() => {
    console.log('🔊 Interruption detected - stopping all audio immediately');
    isInterruptedRef.current = true;

    // Immediate state updates for responsive feel
    setIsPlaying(false);
    setIsLoading(false);

    // Stop current audio immediately
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.src = '';
      } catch (error) {
        console.warn('🔊 Error stopping audio:', error);
      }
      setCurrentAudio(null);
    }

    // Stop browser speech synthesis
    if (window.speechSynthesis?.speaking) {
      try {
        window.speechSynthesis.cancel();
        console.log('🔊 Browser speech synthesis cancelled');
      } catch (error) {
        console.warn('🔊 Error cancelling speech synthesis:', error);
      }
    }

    // Clear active request
    activeRequestRef.current = null;

    // Notify interruption
    onInterrupted?.();
    
    console.log('✅ Audio playback stopped and cleaned up');rrentAudio(null);

    // Stop ElevenLabs audio
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

    // Stop browser speech synthesis immediately
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume(); // Ensure it's not paused before canceling
        console.log('🔊 Browser speech synthesis stopped immediately');
      } catch (error) {
        console.warn('🔊 Browser speech stop error:', error);
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