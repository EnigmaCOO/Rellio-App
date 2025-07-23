import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Scripture } from "@shared/schema";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  gender?: string;
  age?: string;
  accent?: string;
  description?: string;
  use_case?: string;
}

interface UseElevenLabsReaderProps {
  scriptures: Scripture[];
  onVerseHighlight?: (verseNumber: number | null) => void;
}

interface UseElevenLabsReaderReturn {
  isPlaying: boolean;
  isPaused: boolean;
  currentVerseIndex: number;
  speed: number;
  volume: number;
  pauseDuration: number;
  availableVoices: ElevenLabsVoice[];
  selectedVoiceIndex: number;
  startReading: (fromIndex?: number) => void;
  pauseReading: () => void;
  resumeReading: () => void;
  stopReading: () => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setPauseDuration: (duration: number) => void;
  setVoice: (voiceIndex: number) => void;
  isLoading: boolean;
}

export function useElevenLabsReader({ 
  scriptures, 
  onVerseHighlight 
}: UseElevenLabsReaderProps): UseElevenLabsReaderReturn {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [pauseDuration, setPauseDuration] = useState(1.5);
  const [availableVoices, setAvailableVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentVerseIndexRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    currentVerseIndexRef.current = currentVerseIndex;
  }, [currentVerseIndex]);

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/elevenlabs/voices');
        if (response.ok) {
          const data = await response.json();
          const maleVoices = data.recommendedMaleVoices || data.allVoices || [];
          setAvailableVoices(maleVoices);
          
          // Auto-select the first recommended male voice
          if (maleVoices.length > 0) {
            setSelectedVoiceIndex(0);
          }
          
          toast({
            title: "ElevenLabs Ready",
            description: `${maleVoices.length} premium voices loaded`,
          });
        } else {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.warn('ElevenLabs voices not available:', error);
          
          // Fallback to browser voices if ElevenLabs fails
          const browserVoices = speechSynthesis.getVoices();
          const fallbackVoices = browserVoices.map((voice, index) => ({
            voice_id: `browser_${index}`,
            name: voice.name,
            category: 'browser',
            gender: voice.name.toLowerCase().includes('male') ? 'male' : 
                    voice.name.toLowerCase().includes('female') ? 'female' : 'unknown'
          }));
          setAvailableVoices(fallbackVoices);
          
          toast({
            title: "Using Browser Voices",
            description: "ElevenLabs API not available. Using system voices as fallback.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error loading voices:', error);
        toast({
          title: "Voice Loading Failed",
          description: "Using browser voices as fallback",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadVoices();
  }, [toast]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  }, []);

  const generateAudio = async (text: string): Promise<string> => {
    const selectedVoice = availableVoices[selectedVoiceIndex];
    if (!selectedVoice) throw new Error('No voice selected');

    // If it's a browser voice, use Web Speech API
    if (selectedVoice.voice_id.startsWith('browser_')) {
      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        const browserVoices = speechSynthesis.getVoices();
        const voiceIndex = parseInt(selectedVoice.voice_id.split('_')[1]);
        
        if (browserVoices[voiceIndex]) {
          utterance.voice = browserVoices[voiceIndex];
        }
        
        utterance.rate = speed * 0.85;
        utterance.pitch = 0.9;
        utterance.volume = volume;

        // Create a blob URL for the utterance (this is a workaround)
        speechSynthesis.speak(utterance);
        
        utterance.onend = () => resolve('browser_speech');
        utterance.onerror = (event) => reject(new Error(event.error));
      });
    }

    // Use ElevenLabs API
    const response = await fetch('/api/elevenlabs/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId: selectedVoice.voice_id,
        settings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Speech generation failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  };

  const playVerse = useCallback(async (verseIndex: number) => {
    console.log('🎵 PlayVerse called:', { verseIndex, scripturesLength: scriptures.length, isPlaying: isPlayingRef.current });
    
    if (verseIndex >= scriptures.length || !isPlayingRef.current) {
      console.log('🛑 Stopping reading - end of verses or not playing');
      stopReading();
      return;
    }

    const verse = scriptures[verseIndex];
    if (!verse || !verse.text) {
      console.log('⚠️ Invalid verse, skipping to next');
      // Skip to next verse if current one is invalid
      setCurrentVerseIndex(verseIndex + 1);
      currentVerseIndexRef.current = verseIndex + 1;
      setTimeout(() => playVerse(verseIndex + 1), 100);
      return;
    }

    try {
      console.log('📖 Reading verse:', { verse: verse.verse, text: verse.text.substring(0, 50) + '...' });
      setCurrentVerseIndex(verseIndex);
      currentVerseIndexRef.current = verseIndex;
      onVerseHighlight?.(verse.verse);

      console.log('🎤 Generating audio...');
      const audioUrl = await generateAudio(verse.text);
      console.log('✅ Audio generated:', audioUrl.substring(0, 50) + '...');
      
      // If using browser speech, handle differently
      if (audioUrl === 'browser_speech') {
        // For browser speech, we just wait for the pause duration and continue
        pauseTimeoutRef.current = setTimeout(() => {
          if (isPlayingRef.current && !isPausedRef.current) {
            playVerse(verseIndex + 1);
          }
        }, pauseDuration * 1000);
        return;
      }

      // Create and play audio element for ElevenLabs
      audioRef.current = new Audio(audioUrl);
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = speed;

      audioRef.current.onended = () => {
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
        
        if (isPlayingRef.current && !isPausedRef.current) {
          // Add pause between verses
          pauseTimeoutRef.current = setTimeout(() => {
            if (isPlayingRef.current && !isPausedRef.current) {
              playVerse(verseIndex + 1);
            }
          }, pauseDuration * 1000);
        }
      };

      audioRef.current.onerror = (error) => {
        console.error('Audio playback error:', error);
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
        // Continue to next verse on error
        if (isPlayingRef.current && !isPausedRef.current) {
          playVerse(verseIndex + 1);
        }
      };

      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing verse:', error);
      toast({
        title: "Playback Error",
        description: "Failed to play verse. Continuing to next verse.",
        variant: "destructive"
      });
      
      // Continue to next verse on error
      if (isPlayingRef.current && !isPausedRef.current) {
        setTimeout(() => playVerse(verseIndex + 1), 500);
      }
    }
  }, [scriptures, onVerseHighlight, pauseDuration, volume, speed, toast]);

  const startReading = useCallback((fromIndex: number = 0) => {
    console.log('🎯 StartReading called:', { 
      scripturesCount: scriptures.length, 
      fromIndex, 
      isLoading,
      availableVoicesCount: availableVoices.length 
    });

    if (scriptures.length === 0) {
      console.log('❌ No scriptures available');
      toast({
        title: "No Content",
        description: "No verses available to read",
        variant: "destructive"
      });
      return;
    }

    if (isLoading) {
      console.log('❌ Still loading voices');
      toast({
        title: "Loading",
        description: "Voices are still loading, please wait...",
        variant: "destructive"
      });
      return;
    }

    if (availableVoices.length === 0) {
      console.log('❌ No voices available');
      toast({
        title: "No Voices",
        description: "No voices available for reading",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Starting reading process...');
    cleanupAudio();
    setIsPlaying(true);
    setIsPaused(false);
    playVerse(fromIndex);
    
    toast({
      title: "Reading Started",
      description: `Starting from verse ${fromIndex + 1}`,
    });
  }, [scriptures, playVerse, cleanupAudio, toast, isLoading, availableVoices.length]);

  const pauseReading = useCallback(() => {
    setIsPaused(true);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    
    toast({
      title: "Reading Paused",
      description: "Auto-reader has been paused",
    });
  }, [toast]);

  const resumeReading = useCallback(() => {
    setIsPaused(false);
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    } else {
      // Continue from current verse if no audio is playing
      playVerse(currentVerseIndexRef.current);
    }
    
    toast({
      title: "Reading Resumed",
      description: "Auto-reader has been resumed",
    });
  }, [playVerse, toast]);

  const stopReading = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    cleanupAudio();
    onVerseHighlight?.(null);
    
    toast({
      title: "Reading Stopped",
      description: "Auto-reader has been stopped",
    });
  }, [cleanupAudio, onVerseHighlight, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      speechSynthesis.cancel();
    };
  }, [cleanupAudio]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing in inputs
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (isPlaying && !isPaused) {
            pauseReading();
          } else if (isPlaying && isPaused) {
            resumeReading();
          } else {
            startReading(currentVerseIndex);
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (isPlaying) {
            stopReading();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, isPaused, currentVerseIndex, startReading, pauseReading, resumeReading, stopReading]);

  return {
    isPlaying,
    isPaused,
    currentVerseIndex,
    speed,
    volume,
    pauseDuration,
    availableVoices,
    selectedVoiceIndex,
    startReading,
    pauseReading,
    resumeReading,
    stopReading,
    setSpeed,
    setVolume,
    setPauseDuration,
    setVoice: setSelectedVoiceIndex,
    isLoading
  };
}