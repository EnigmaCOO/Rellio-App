import { useState, useCallback, useRef } from 'react';

interface ReliableTTSOptions {
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function useReliableTTS({
  volume = 0.8,
  onStart,
  onEnd,
  onError
}: ReliableTTSOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isInterruptedRef = useRef(false);

  const stopPlayback = useCallback(() => {
    console.log('🔊 Stopping TTS playback...');
    isInterruptedRef.current = true;
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setIsPlaying(false);
    setIsLoading(false);
    currentUtteranceRef.current = null;
  }, []);

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
      if (!('speechSynthesis' in window)) {
        throw new Error('Browser speech synthesis not supported');
      }

      // Clear any existing speech
      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 100));

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.volume = Math.min(volume, 1.0);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Get the best available voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice =>
        voice.lang.includes('en') && (
          voice.name.includes('Google') || 
          voice.name.includes('Microsoft') || 
          voice.name.includes('Natural') ||
          voice.name.includes('Enhanced')
        )
      ) || voices.find(voice => voice.lang.includes('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log('🔊 Using voice:', preferredVoice.name);
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
        setIsPlaying(false);
        setIsLoading(false);
        currentUtteranceRef.current = null;
        onEnd?.();
      };

      utterance.onerror = (event) => {
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