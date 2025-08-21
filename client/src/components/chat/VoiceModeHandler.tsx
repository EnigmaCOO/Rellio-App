
import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted';

export interface VoiceModeHandlerProps {
  onTranscript: (text: string, isInterim: boolean) => void;
  onAutoSend: (text: string) => void;
  onStateChange: (state: VoiceState) => void;
  onInterrupt: () => void;
  disabled?: boolean;
  isAIResponding?: boolean;
  autoSendDelay?: number;
  confidenceThreshold?: number;
  interruptionSensitivity?: number;
}

export interface VoiceModeHandlerReturn {
  isListening: boolean;
  currentTranscript: string;
  confidence: number;
  voiceState: VoiceState;
  audioLevel: number;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  toggleListening: () => Promise<boolean>;
  isSupported: boolean;
  hasPermission: boolean;
  interruptAI: () => void;
}

export function useVoiceModeHandler({
  onTranscript,
  onAutoSend,
  onStateChange,
  onInterrupt,
  disabled = false,
  isAIResponding = false,
  autoSendDelay = 1500,
  confidenceThreshold = 0.8,
  interruptionSensitivity = 0.3
}: VoiceModeHandlerProps): VoiceModeHandlerReturn {
  
  // Core state
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Single recognition instance
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  // Check support once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    // Check permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false));
    }
  }, []);

  const updateVoiceState = useCallback((newState: VoiceState) => {
    console.log('🎤 State change:', newState);
    setVoiceState(newState);
    onStateChange(newState);
  }, [onStateChange]);

  // Cleanup function
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
    setAudioLevel(0);
    setConfidence(0);
    updateVoiceState('idle');
  }, [updateVoiceState]);

  // Start listening - simplified and robust
  const startListening = useCallback(async (): Promise<boolean> => {
    console.log('🎤 Starting listening...');
    
    if (!isSupported) {
      console.error('❌ Speech recognition not supported');
      return false;
    }
    
    if (disabled) {
      console.log('⏸️ Voice input disabled');
      return false;
    }

    if (isInitializingRef.current) {
      console.log('⏳ Already initializing...');
      return false;
    }

    // Cleanup any existing recognition
    cleanup();
    
    isInitializingRef.current = true;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('✅ Recognition started');
        setIsListening(true);
        updateVoiceState('listening');
        setAudioLevel(0.5); // Simple audio indication
        isInitializingRef.current = false;
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          const resultConfidence = event.results[i][0].confidence || 0.8;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            setConfidence(resultConfidence);
          } else {
            interimTranscript += transcript + ' ';
          }
        }
        
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        console.log('📝 Transcript:', fullTranscript);
        
        setCurrentTranscript(fullTranscript);
        onTranscript(fullTranscript, interimTranscript.length > 0);
        
        // Auto-send on final result
        if (finalTranscript.trim() && confidence >= confidenceThreshold) {
          console.log('🚀 Scheduling auto-send');
          
          if (autoSendTimeoutRef.current) {
            clearTimeout(autoSendTimeoutRef.current);
          }
          
          autoSendTimeoutRef.current = setTimeout(() => {
            const messageToSend = finalTranscript.trim();
            console.log('📤 Auto-sending:', messageToSend);
            
            // Clear state before sending
            setCurrentTranscript('');
            setIsListening(false);
            updateVoiceState('processing');
            
            // Send message
            onAutoSend(messageToSend);
            
            // Reset to idle after brief processing state
            setTimeout(() => updateVoiceState('idle'), 500);
          }, autoSendDelay);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('🎤 Recognition error:', event.error);
        isInitializingRef.current = false;
        
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // These are normal, don't reset everything
          return;
        }
        
        cleanup();
      };

      recognition.onend = () => {
        console.log('🛑 Recognition ended');
        isInitializingRef.current = false;
        setIsListening(false);
        setAudioLevel(0);
        
        if (voiceState !== 'processing') {
          updateVoiceState('idle');
        }
      };

      // Start recognition
      recognition.start();
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start recognition:', error);
      isInitializingRef.current = false;
      cleanup();
      return false;
    }
  }, [isSupported, disabled, cleanup, updateVoiceState, onTranscript, onAutoSend, autoSendDelay, confidence, confidenceThreshold, voiceState]);

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

  const interruptAI = useCallback(() => {
    console.log('🛑 Interrupting AI');
    updateVoiceState('interrupted');
    onInterrupt();
  }, [updateVoiceState, onInterrupt]);

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
    audioLevel,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
    hasPermission,
    interruptAI
  };
}
