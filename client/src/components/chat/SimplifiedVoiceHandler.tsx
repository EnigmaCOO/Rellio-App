import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface SimplifiedVoiceHandlerProps {
  onTranscript: (text: string, isInterim: boolean) => void;
  onAutoSend: (text: string) => void;
  onStateChange: (state: VoiceState) => void;
  disabled?: boolean;
  autoSendDelay?: number;
  confidenceThreshold?: number;
}

export interface SimplifiedVoiceHandlerReturn {
  isListening: boolean;
  currentTranscript: string;
  confidence: number;
  voiceState: VoiceState;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  toggleListening: () => Promise<boolean>;
  isSupported: boolean;
}

export function useSimplifiedVoiceHandler({
  onTranscript,
  onAutoSend,
  onStateChange,
  disabled = false,
  autoSendDelay = 2000,
  confidenceThreshold = 0.7
}: SimplifiedVoiceHandlerProps): SimplifiedVoiceHandlerReturn {

  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializing = useRef(false);

  // Check support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const updateVoiceState = useCallback((newState: VoiceState) => {
    console.log('🎤 Voice state:', newState);
    setVoiceState(newState);
    onStateChange(newState);
  }, [onStateChange]);

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up voice handler');

    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        console.warn('Error aborting recognition:', error);
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    setCurrentTranscript('');
    setConfidence(0);
    isInitializing.current = false;
    updateVoiceState('idle');
  }, [updateVoiceState]);

  const startListening = useCallback(async (): Promise<boolean> => {
    console.log('🎤 Starting listening...');

    if (!isSupported || disabled || isInitializing.current) {
      return false;
    }

    cleanup();
    isInitializing.current = true;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('✅ Recognition started');
        setIsListening(true);
        updateVoiceState('listening');
        isInitializing.current = false;
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let maxConfidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          const resultConfidence = event.results[i][0].confidence || 0.8;

          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            maxConfidence = Math.max(maxConfidence, resultConfidence);
          } else {
            interimTranscript += transcript + ' ';
          }
        }

        const fullTranscript = (finalTranscript + interimTranscript).trim();
        setCurrentTranscript(fullTranscript);
        setConfidence(maxConfidence);
        onTranscript(fullTranscript, interimTranscript.length > 0);

        // Simple auto-send logic
        if (finalTranscript.trim() && maxConfidence >= confidenceThreshold) {
          console.log('🎯 Auto-send triggered');

          if (autoSendTimeoutRef.current) {
            clearTimeout(autoSendTimeoutRef.current);
          }

          autoSendTimeoutRef.current = setTimeout(() => {
            console.log('🚀 Auto-sending:', finalTranscript.trim());
            setCurrentTranscript('');
            setIsListening(false);
            updateVoiceState('processing');
            onAutoSend(finalTranscript.trim());

            setTimeout(() => updateVoiceState('idle'), 500);
          }, autoSendDelay);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('🎤 Recognition error:', event.error);
        isInitializing.current = false;

        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          cleanup();
        }
      };

      recognition.onend = () => {
        console.log('🛑 Recognition ended');
        isInitializing.current = false;
        setIsListening(false);

        if (voiceState !== 'processing') {
          updateVoiceState('idle');
        }
      };

      recognition.start();
      return true;

    } catch (error) {
      console.error('❌ Failed to start recognition:', error);
      isInitializing.current = false;
      cleanup();
      return false;
    }
  }, [isSupported, disabled, cleanup, updateVoiceState, onTranscript, onAutoSend, autoSendDelay, confidenceThreshold, voiceState]);

  const stopListening = useCallback(() => {
    console.log('🛑 Stopping listening');
    cleanup();
  }, [cleanup]);

  const toggleListening = useCallback(async (): Promise<boolean> => {
    if (isListening) {
      stopListening();
      return false;
    } else {
      return await startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    currentTranscript,
    confidence,
    voiceState,
    startListening,
    stopListening,
    toggleListening,
    isSupported
  };
}