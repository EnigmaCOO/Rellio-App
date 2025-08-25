
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
  confidenceThreshold = 0.85, // Enhanced confidence threshold as recommended
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

  // Enhanced state management for robust auto-send
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const isInitializingRef = useRef(false);
  const speechEndCountRef = useRef<number>(0);

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

  // Enhanced cleanup function with new timeouts
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up voice handler');
    
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (silenceDetectionRef.current) {
      clearTimeout(silenceDetectionRef.current);
      silenceDetectionRef.current = null;
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
    speechEndCountRef.current = 0;
    lastSpeechTimeRef.current = 0;
    updateVoiceState('idle');
  }, [updateVoiceState]);

  // Enhanced silence detection algorithm with sliding window
  const handleSilenceDetection = useCallback((transcript: string, confidence: number) => {
    console.log('🔊 Silence detection - transcript:', transcript, 'confidence:', confidence);
    
    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Only proceed if confidence meets threshold
    if (confidence < confidenceThreshold) {
      console.log('⚠️ Confidence too low for auto-send:', confidence);
      return;
    }

    // Debounce to filter noise-induced pauses (300ms)
    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🎯 Debounce completed, checking for sustained silence...');
      
      // Clear existing silence detection
      if (silenceDetectionRef.current) {
        clearTimeout(silenceDetectionRef.current);
      }
      
      // Sliding window: wait for 1-2s of sustained silence to confirm intent
      const silenceWindow = Math.random() * 1000 + 1000; // 1-2 second window
      
      silenceDetectionRef.current = setTimeout(() => {
        const now = Date.now();
        const timeSinceLastSpeech = now - lastSpeechTimeRef.current;
        
        console.log('⏰ Silence window completed. Time since last speech:', timeSinceLastSpeech);
        
        // Confirm intent by checking if sufficient silence has passed
        if (timeSinceLastSpeech >= 1000 && transcript.trim()) {
          console.log('🚀 Auto-send confirmed - sufficient silence and valid transcript');
          
          // Clear state before sending
          setCurrentTranscript('');
          setIsListening(false);
          updateVoiceState('processing');
          
          // Send message
          onAutoSend(transcript.trim());
          
          // Reset to idle after brief processing state
          setTimeout(() => updateVoiceState('idle'), 500);
        } else {
          console.log('⚠️ Auto-send cancelled - insufficient silence or empty transcript');
        }
      }, silenceWindow);
    }, 300); // 300ms debounce
  }, [confidenceThreshold, onAutoSend, updateVoiceState]);

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
        let maxConfidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          const resultConfidence = event.results[i][0].confidence || 0.8;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            maxConfidence = Math.max(maxConfidence, resultConfidence);
            lastSpeechTimeRef.current = Date.now(); // Track speech timing
          } else {
            interimTranscript += transcript + ' ';
            lastSpeechTimeRef.current = Date.now(); // Track ongoing speech
          }
        }
        
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        console.log('📝 Enhanced transcript:', fullTranscript, 'confidence:', maxConfidence);
        
        setCurrentTranscript(fullTranscript);
        setConfidence(maxConfidence);
        onTranscript(fullTranscript, interimTranscript.length > 0);
        
        // Enhanced auto-send with silence detection algorithm
        if (finalTranscript.trim()) {
          console.log('🎯 Final transcript detected, initiating enhanced auto-send logic');
          handleSilenceDetection(finalTranscript.trim(), maxConfidence);
        }
      };

      // Enhanced speechend event handler for better intent detection
      recognition.onspeechend = () => {
        console.log('🗣️ Speech ended detected by browser');
        speechEndCountRef.current += 1;
        
        // Additional confirmation that user has finished speaking
        const currentTranscriptValue = currentTranscript.trim();
        if (currentTranscriptValue && confidence >= confidenceThreshold) {
          console.log('🎯 Speech end confirmed, reinforcing auto-send decision');
          handleSilenceDetection(currentTranscriptValue, confidence);
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
