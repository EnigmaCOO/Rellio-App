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

  // Create audio element with event handlers
  const createAudioElement = useCallback((audioBlob: Blob) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio();
    const audioUrl = URL.createObjectURL(audioBlob);
    audio.src = audioUrl;
    audio.volume = volume;
    audio.preload = 'auto';

    // Set up event listeners
    audio.addEventListener('loadstart', () => {
      console.log('🔊 Audio loading started');
      setIsLoading(true);
    });

    audio.addEventListener('canplaythrough', () => {
      console.log('🔊 Audio ready to play');
      setIsLoading(false);
      if (autoPlay && !isInterruptedRef.current) {
        audio.play().catch(error => {
          console.error('🔊 Auto-play failed:', error);
          onError?.('Auto-play blocked. Click to play manually.');
        });
      }
    });

    audio.addEventListener('play', () => {
      console.log('🔊 Audio playback started');
      setIsPlaying(true);
      setCurrentAudio(audio);
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
      console.error('🔊 Audio playback error:', event);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentAudio(null);
      URL.revokeObjectURL(audioUrl);
      onError?.('Audio playback failed');
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

      // Get audio blob
      const audioBlob = await response.blob();
      console.log('🔊 Audio blob received:', audioBlob.size, 'bytes');

      // Create and setup audio element
      if (!isInterruptedRef.current) {
        createAudioElement(audioBlob);
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
      audioRef.current.src = '';
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