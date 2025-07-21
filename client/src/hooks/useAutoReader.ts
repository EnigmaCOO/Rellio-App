import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Scripture } from "@shared/schema";

interface UseAutoReaderProps {
  scriptures: Scripture[];
  onVerseHighlight?: (verseNumber: number | null) => void;
}

interface UseAutoReaderReturn {
  isPlaying: boolean;
  isPaused: boolean;
  currentVerseIndex: number;
  speed: number;
  volume: number;
  pauseDuration: number;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceIndex: number;
  startReading: (fromIndex?: number) => void;
  pauseReading: () => void;
  resumeReading: () => void;
  stopReading: () => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setPauseDuration: (duration: number) => void;
  setVoice: (voiceIndex: number) => void;
}

export function useAutoReader({ 
  scriptures, 
  onVerseHighlight 
}: UseAutoReaderProps): UseAutoReaderReturn {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Keep refs in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [pauseDuration, setPauseDuration] = useState(1.5);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = speechSynthesis.getVoices();
      
      // Filter and prioritize natural-sounding English voices
      const englishVoices = allVoices.filter(voice => 
        voice.lang.startsWith('en') && voice.name.toLowerCase().includes('natural') ||
        voice.lang.startsWith('en') && voice.name.toLowerCase().includes('neural') ||
        voice.lang.startsWith('en') && voice.name.toLowerCase().includes('premium') ||
        voice.lang.startsWith('en') && !voice.name.toLowerCase().includes('microsoft') ||
        voice.lang.startsWith('en')
      );
      
      // Sort voices to prioritize better quality ones
      const sortedVoices = englishVoices.sort((a, b) => {
        // Prioritize voices with quality indicators
        const aScore = getVoiceQualityScore(a);
        const bScore = getVoiceQualityScore(b);
        return bScore - aScore;
      });
      
      // Add non-English voices at the end
      const otherVoices = allVoices.filter(voice => !voice.lang.startsWith('en'));
      const finalVoices = [...sortedVoices, ...otherVoices];
      
      setAvailableVoices(finalVoices);
      
      // Select the best quality female English voice by default
      const femaleVoiceIndex = finalVoices.findIndex(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.toLowerCase().includes('female') || 
         voice.name.toLowerCase().includes('woman') ||
         voice.name.toLowerCase().includes('sara') ||
         voice.name.toLowerCase().includes('allison') ||
         voice.name.toLowerCase().includes('karen') ||
         voice.name.toLowerCase().includes('samantha'))
      );
      
      const defaultIndex = femaleVoiceIndex >= 0 ? femaleVoiceIndex : 0;
      setSelectedVoiceIndex(defaultIndex);
    };

    const getVoiceQualityScore = (voice: SpeechSynthesisVoice): number => {
      let score = 0;
      const name = voice.name.toLowerCase();
      
      // Higher scores for better quality indicators
      if (name.includes('natural')) score += 10;
      if (name.includes('neural')) score += 8;
      if (name.includes('premium')) score += 6;
      if (name.includes('enhanced')) score += 4;
      if (name.includes('high quality')) score += 4;
      
      // Prefer system voices over web voices
      if (voice.localService) score += 5;
      
      // Gender preference (slight preference for female voices for religious texts)
      if (name.includes('female') || name.includes('woman')) score += 2;
      
      // Penalize robotic-sounding voices
      if (name.includes('robot')) score -= 5;
      if (name.includes('microsoft')) score -= 2; // Often more robotic
      
      return score;
    };

    // Load voices immediately if available
    loadVoices();
    
    // Also listen for the voiceschanged event (needed for some browsers)
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Cleanup on unmount or when scriptures change
  useEffect(() => {
    return () => {
      stopReading();
    };
  }, [scriptures]);

  // Highlight current verse
  useEffect(() => {
    if (isPlaying && !isPaused && onVerseHighlight) {
      const currentVerse = scriptures[currentVerseIndex];
      onVerseHighlight(currentVerse?.verse || null);
    }
  }, [currentVerseIndex, isPlaying, isPaused, onVerseHighlight, scriptures]);

  const scrollToVerse = useCallback((verseNumber: number) => {
    const verseElement = document.getElementById(`verse-${verseNumber}`);
    if (verseElement) {
      verseElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, []);

  const highlightVerse = useCallback((verseNumber: number | null) => {
    // Remove previous highlights
    scriptures.forEach(scripture => {
      const element = document.getElementById(`verse-${scripture.verse}`);
      if (element) {
        element.classList.remove('bg-blue-100', 'border-l-4', 'border-blue-500');
        element.style.backgroundColor = '';
        element.style.borderLeft = '';
        element.style.transition = '';
      }
    });

    // Add highlight to current verse
    if (verseNumber) {
      const element = document.getElementById(`verse-${verseNumber}`);
      if (element) {
        element.style.backgroundColor = '#E0F7FA'; // light blue
        element.style.borderLeft = '4px solid #0ea5e9'; // blue-500
        element.style.transition = 'all 0.3s ease';
        scrollToVerse(verseNumber);
      }
    }
  }, [scriptures, scrollToVerse]);

  const speakVerse = useCallback((verse: Scripture, index: number) => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: "Speech Not Supported",
        description: "Text-to-speech is not supported in your browser",
        variant: "destructive",
      });
      stopReading();
      return;
    }

    // Cancel any existing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(verse.text);
    utterance.rate = speed * 0.85; // Slightly slower for better comprehension
    utterance.pitch = 0.9; // Slightly lower pitch for more natural sound
    utterance.volume = volume;
    
    // Add natural pauses for better readability
    const textWithPauses = verse.text
      .replace(/\./g, '.')  // Keep periods
      .replace(/,/g, ', ')  // Add slight pause after commas
      .replace(/;/g, '; ')  // Add pause after semicolons
      .replace(/:/g, ': ')  // Add pause after colons
      .replace(/\?/g, '? ') // Add pause after questions
      .replace(/!/g, '! '); // Add pause after exclamations
    
    utterance.text = textWithPauses;
    
    if (availableVoices.length > 0 && availableVoices[selectedVoiceIndex]) {
      utterance.voice = availableVoices[selectedVoiceIndex];
    }

    utterance.onstart = () => {
      console.log(`Starting to read verse ${index + 1} of ${scriptures.length}: "${verse.text.slice(0, 50)}..."`);
      setCurrentVerseIndex(index);
      highlightVerse(verse.verse);
    };

    utterance.onend = () => {
      console.log(`Finished reading verse ${index + 1}. IsPlaying: ${isPlayingRef.current}, IsPaused: ${isPausedRef.current}`);
      if (isPlayingRef.current && !isPausedRef.current) {
        // Pause between verses
        pauseTimeoutRef.current = setTimeout(() => {
          const nextIndex = index + 1;
          console.log(`After pause, moving to verse ${nextIndex + 1}. Total verses: ${scriptures.length}`);
          if (nextIndex < scriptures.length && isPlayingRef.current && !isPausedRef.current) {
            speakVerse(scriptures[nextIndex], nextIndex);
          } else if (nextIndex >= scriptures.length) {
            // Finished reading all verses - directly stop here
            speechSynthesis.cancel();
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentVerseIndex(0);
            
            // Clear any timeouts
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            if (pauseTimeoutRef.current) {
              clearTimeout(pauseTimeoutRef.current);
              pauseTimeoutRef.current = null;
            }

            // Remove highlights
            highlightVerse(null);
            
            toast({
              title: "Chapter Complete",
              description: "Finished reading all verses in this chapter",
            });
          }
        }, pauseDuration * 1000);
      }
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      toast({
        title: "Speech Error",
        description: "Could not read the verse aloud",
        variant: "destructive",
      });
      stopReading();
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [speed, volume, selectedVoiceIndex, availableVoices, pauseDuration, scriptures, toast, highlightVerse]);

  const startReading = useCallback((fromIndex = 0) => {
    if (scriptures.length === 0) {
      toast({
        title: "No Verses Available",
        description: "No verses available to read",
        variant: "destructive",
      });
      return;
    }

    setIsPlaying(true);
    setIsPaused(false);
    setCurrentVerseIndex(fromIndex);
    speakVerse(scriptures[fromIndex], fromIndex);
  }, [scriptures, speakVerse, toast]);

  const pauseReading = useCallback(() => {
    if (isPlaying) {
      speechSynthesis.pause();
      setIsPaused(true);
      
      // Clear any pending timeout
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
    }
  }, [isPlaying]);

  const resumeReading = useCallback(() => {
    if (isPlaying && isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPlaying, isPaused]);

  const stopReading = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentVerseIndex(0);
    
    // Clear any timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }

    // Remove highlights
    highlightVerse(null);
  }, [highlightVerse]);

  const setVoice = useCallback((voiceIndex: number) => {
    setSelectedVoiceIndex(voiceIndex);
  }, []);

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
    setVoice,
  };
}