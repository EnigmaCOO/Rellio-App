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
  const audioElementRef = useRef<HTMLAudioElement | null>(null); // Ref for the current audio element
  const isLoadingRef = useRef(false); // Ref to track loading state
  const isPlayingRef = useRef(false); // Ref to track playing state

  // Check browser support
  useEffect(() => {
    setIsSupported('Audio' in window && 'fetch' in window);
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
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

  // Fallback TTS function
  const fallbackToBrowserTTS = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.log('🔊 No TTS available');
      onError?.('No TTS available');
      return;
    }

    console.log('🔊 Using browser TTS fallback');

    // Cancel any ongoing speech synthesis to prevent overlap
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Attempt to use a more natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice =>
      voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Natural'))
    );

    if (englishVoice) {
      utterance.voice = englishVoice;
      console.log('🔊 Using enhanced voice for fallback:', englishVoice.name);
    } else {
      console.log('🔊 Using default system voice for fallback');
    }

    utterance.onstart = () => {
      console.log('🔊 Browser TTS started');
      setIsPlaying(true);
      isPlayingRef.current = true;
      onStart?.(); // Call onStart when browser TTS begins
    };

    utterance.onend = () => {
      console.log('🔊 Browser TTS ended');
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentAudio(null); // Ensure currentAudio is null when using browser TTS
      onEnd?.();
    };

    utterance.onerror = (event) => {
      console.error('🔊 Browser TTS error:', event.error);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentAudio(null);
      onError?.(`Browser TTS failed: ${event.error}`);
    };

    // Speak the utterance
    try {
      window.speechSynthesis.speak(utterance);
      console.log('✅ Browser TTS activated');
    } catch (speakError) {
      console.error('🔊 Error speaking utterance:', speakError);
      onError?.('Failed to initiate browser TTS');
    }
  }, [volume, onStart, onEnd, onError]);


  // Enhanced playText function with better ElevenLabs integration
  const playText = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || isLoadingRef.current || isPlayingRef.current) {
      console.log('🔊 Skipping TTS - conditions not met:', {
        hasText: !!text.trim(),
        isLoading: isLoadingRef.current,
        isPlaying: isPlayingRef.current
      });
      return;
    }

    // Prevent duplicate requests with server-side deduplication backup
    const textHash = btoa(text.slice(0, 100)).slice(0, 16);
    if (activeRequestRef.current === textHash) {
      console.log('🔊 Skipping duplicate TTS request');
      return;
    }
    activeRequestRef.current = textHash;

    try {
      console.log('🔊 Starting ElevenLabs TTS for text:', text.substring(0, 50) + '...');
      setIsLoading(true);
      isLoadingRef.current = true;

      // Call onStart callback
      onStart?.();

      // Enhanced text cleaning for better speech synthesis
      const cleanedText = text
        .replace(/<perspective>.*?<\/perspective>/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanedText) {
        console.log('🔊 No clean text after processing, skipping TTS');
        setIsLoading(false);
        isLoadingRef.current = false;
        activeRequestRef.current = null; // Clear request hash if no text
        return;
      }

      console.log('🔊 Requesting TTS from server...');

      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanedText,
          voice_id: voiceId,
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 ElevenLabs API error:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      console.log('✅ ElevenLabs response received, creating audio...');

      // Get the audio blob from the response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and configure audio element
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      audio.volume = volume;
      audio.preload = 'auto';

      // Enhanced audio event handlers
      const handleCanPlay = () => {
        console.log('🔊 Audio ready to play');
      };

      const handlePlay = () => {
        console.log('🔊 Audio playback started');
        setIsPlaying(true);
        setIsLoading(false);
        isPlayingRef.current = true;
        isLoadingRef.current = false;
      };

      const handleEnded = () => {
        console.log('🔊 Audio playback ended naturally');
        setIsPlaying(false);
        setIsLoading(false);
        isPlayingRef.current = false;
        isLoadingRef.current = false;

        // Cleanup
        URL.revokeObjectURL(audioUrl);
        audioElementRef.current = null;

        // Call onEnd callback
        onEnd?.();
      };

      const handleError = (event: Event) => {
        console.error('🔊 Audio playback error:', event);
        setIsPlaying(false);
        setIsLoading(false);
        isPlayingRef.current = false;
        isLoadingRef.current = false;

        // Cleanup
        URL.revokeObjectURL(audioUrl);
        audioElementRef.current = null;

        // Call onError callback
        onError?.('Audio playback failed');

        // Fallback to browser TTS for critical functionality
        console.log('🔊 Attempting browser TTS fallback...');
        fallbackToBrowserTTS(cleanedText);
      };

      const handlePause = () => {
        console.log('🔊 Audio paused/interrupted');
        setIsPlaying(false);
        isPlayingRef.current = false;

        // Call onInterrupted callback if this was not a natural end
        if (audio.currentTime < audio.duration - 0.1) {
          onInterrupted?.();
        }
      };

      // Attach event listeners
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('pause', handlePause);

      // Auto-play if enabled, with user interaction check
      if (autoPlay) {
        console.log('🔊 Auto-playing TTS audio...');

        // Promise-based play with proper error handling
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ TTS audio started successfully');
            })
            .catch((error) => {
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
                  const retryPromise = audio.play();
                  if (retryPromise) {
                    retryPromise.catch(() => {
                      console.log('🔊 Audio retry also failed, continuing without voice');
                      fallbackToBrowserTTS(cleanedText);
                    });
                  }
                } catch (retryError) {
                  console.log('🔊 Audio retry also failed, continuing without voice');
                  fallbackToBrowserTTS(cleanedText);
                }
              } else {
                console.log('🔊 Audio play failed, continuing without voice');
                fallbackToBrowserTTS(cleanedText);
              }
            });
        }
      } else {
        // If not auto-playing, still mark as ready
        setIsLoading(false);
        isLoadingRef.current = false;
        console.log('🔊 TTS audio ready (auto-play disabled)');
      }

    } catch (error) {
      console.error('🔊 ElevenLabs TTS error:', error);
      setIsPlaying(false);
      setIsLoading(false);
      isPlayingRef.current = false;
      isLoadingRef.current = false;

      // Call onError callback
      onError?.(typeof error === 'string' ? error : 'TTS failed');

      // Fallback to browser TTS for critical functionality
      console.log('🔊 Attempting browser TTS fallback...');
      const cleanText = text
        .replace(/<perspective>.*?<\/perspective>/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      fallbackToBrowserTTS(cleanText);
    } finally {
      // Always clear active request hash after processing
      activeRequestRef.current = null;
    }
  }, [voiceId, volume, autoPlay, onStart, onEnd, onError, onInterrupted, fallbackToBrowserTTS, cleanTextForSpeech]);

  // Enhanced stop playback with immediate response
  const stopPlayback = useCallback(() => {
    console.log('🔊 Interruption detected - stopping all audio immediately');
    isInterruptedRef.current = true; // Set interruption flag

    // Immediate state updates for responsive feel
    setIsPlaying(false);
    setIsLoading(false);
    isPlayingRef.current = false;
    isLoadingRef.current = false;

    // Stop current audio immediately
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        const currentSrc = audioElementRef.current.src;
        audioElementRef.current.src = ''; // Clear source
        if (currentSrc && currentSrc.startsWith('blob:')) {
          URL.revokeObjectURL(currentSrc); // Revoke blob URL
        }
      } catch (error) {
        console.warn('🔊 Error stopping audio element:', error);
      }
      audioElementRef.current = null; // Clear ref
    }

    // Stop browser speech synthesis
    if ('speechSynthesis' in window && window.speechSynthesis?.speaking) {
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

    console.log('✅ Audio playback stopped and cleaned up');
  }, [onInterrupted]);

  // Pause current playback
  const pausePlayback = useCallback(() => {
    if (audioElementRef.current && !audioElementRef.current.paused) {
      console.log('🔊 Pausing playback');
      audioElementRef.current.pause();
      setIsPlaying(false); // Update state
      isPlayingRef.current = false;
    } else if ('speechSynthesis' in window && window.speechSynthesis?.speaking) {
      console.log('🔊 Pausing browser speech synthesis');
      window.speechSynthesis.pause();
      setIsPlaying(false); // Update state
      isPlayingRef.current = false;
    }
  }, []);

  // Resume paused playback
  const resumePlayback = useCallback(() => {
    if (audioElementRef.current && audioElementRef.current.paused) {
      console.log('🔊 Resuming playback');
      audioElementRef.current.play().then(() => {
        setIsPlaying(true); // Update state
        isPlayingRef.current = true;
        console.log('✅ Resumed playback');
      }).catch(error => {
        console.error('🔊 Resume play failed:', error);
        onError?.('Failed to resume playback');
      });
    } else if ('speechSynthesis' in window && !window.speechSynthesis?.speaking) {
      console.log('🔊 Resuming browser speech synthesis');
      window.speechSynthesis.resume();
      setIsPlaying(true); // Update state
      isPlayingRef.current = true;
    }
  }, [onError]);

  // Update volume when changed
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume;
    }
  }, [volume]);

  return {
    isPlaying,
    isLoading,
    currentAudio: audioElementRef.current, // Return the ref's current value
    playText,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    isSupported,
    volume,
    setVolume
  };
}