import { useState, useCallback, useRef } from 'react';

interface ReliableTTSOptions {
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  // LEGEND LABS: Gain control for 300ms fade-out during interruptions
  gainNode?: GainNode | null;
}

export function useReliableTTS({
  volume = 0.8,
  onStart,
  onEnd,
  onError,
  gainNode = null
}: ReliableTTSOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isInterruptedRef = useRef(false);
  const ttsInterruptedRef = useRef(false);

  const stopPlayback = useCallback(() => {
    console.log('🔊 LEGEND LABS: Stopping TTS playback with gain fade support...');
    isInterruptedRef.current = true;
    ttsInterruptedRef.current = true; // Mark as intentionally interrupted
    
    try {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        console.log('✅ TTS cancelled successfully');
      }
    } catch (error) {
      console.warn('⚠️ TTS cancel error:', error);
    }
    
    setIsPlaying(false);
    setIsLoading(false);
    currentUtteranceRef.current = null;
    
    // Call onEnd callback when stopping (if available)
    if (onEnd) {
      try {
        onEnd();
      } catch (error) {
        console.warn('⚠️ onEnd callback error:', error);
      }
    }
  }, [onEnd]);

  const playText = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || isLoading || isPlaying) {
      console.log('🔊 Skipping TTS - busy or no text');
      return;
    }

    console.log('🔊 Starting reliable browser TTS...');
    setIsLoading(true);
    isInterruptedRef.current = false;

    // Clean text for speech
    const cleanedText = text
      .replace(/<perspective>.*?<\/perspective>/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedText) {
      console.log('🔊 No clean text after processing');
      setIsLoading(false);
      return;
    }

    try {
      if (!('speechSynthesis' in window) || !window.speechSynthesis) {
        throw new Error('Browser speech synthesis not supported');
      }

      // Clear any existing speech with error handling
      try {
        window.speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (cancelError) {
        console.warn('🔊 Could not cancel existing speech:', cancelError);
      }

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.volume = Math.min(volume, 1.0);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Get the best available voice with defensive programming
      let voices: SpeechSynthesisVoice[] = [];
      try {
        voices = window.speechSynthesis.getVoices() || [];
        
        // If no voices yet, wait a moment and try again (common browser issue)
        if (voices.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
          voices = window.speechSynthesis.getVoices() || [];
        }
      } catch (error) {
        console.warn('🔊 Could not get voices:', error);
        voices = [];
      }
      
      if (voices.length > 0) {
        const preferredVoice = voices.find(voice =>
          voice && voice.lang && voice.lang.includes('en') && voice.name && (
            voice.name.includes('Google') || 
            voice.name.includes('Microsoft') || 
            voice.name.includes('Natural') ||
            voice.name.includes('Enhanced')
          )
        ) || voices.find(voice => voice && voice.lang && voice.lang.includes('en'));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          console.log('🔊 Using voice:', preferredVoice.name);
        }
      } else {
        console.log('🔊 Using default system voice (no voices available yet)');
      }

      utterance.onstart = () => {
        if (!isInterruptedRef.current) {
          console.log('✅ TTS started - you should hear this!');
          setIsPlaying(true);
          setIsLoading(false);
          onStart?.();
        }
      };

      utterance.onend = () => {
        console.log('✅ TTS completed');
        ttsInterruptedRef.current = false; // Clear interrupted flag on normal end
        setIsPlaying(false);
        setIsLoading(false);
        currentUtteranceRef.current = null;
        onEnd?.();
      };

      utterance.onerror = (event) => {
        // Suppress expected "interrupted" errors when TTS is intentionally stopped
        if (ttsInterruptedRef.current && event.error === 'interrupted') {
          console.log('✅ TTS interrupted intentionally (not an error)');
          ttsInterruptedRef.current = false; // Clear flag
          setIsPlaying(false);
          setIsLoading(false);
          currentUtteranceRef.current = null;
          onEnd?.(); // Call onEnd instead of onError
          return;
        }
        
        console.error('🔊 TTS error:', event.error);
        setIsPlaying(false);
        setIsLoading(false);
        currentUtteranceRef.current = null;
        onError?.(`TTS failed: ${event.error}`);
        onEnd?.();
      };

      if (!isInterruptedRef.current) {
        currentUtteranceRef.current = utterance;
        console.log('🔊 Starting speech synthesis...');
        window.speechSynthesis.speak(utterance);
        console.log('✅ Speech synthesis initiated successfully');
      }

    } catch (error) {
      console.error('🔊 TTS setup failed:', error);
      setIsPlaying(false);
      setIsLoading(false);
      onError?.(`TTS setup failed: ${error}`);
      onEnd?.();
    }
  }, [volume, onStart, onEnd, onError]);

  return {
    playText,
    stopPlayback,
    isPlaying,
    isLoading
  };
}