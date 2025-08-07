import { useState, useEffect, useRef, useCallback } from 'react';

// Enhanced Web Speech API declarations for better TypeScript support

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
  autoSendDelay?: number; // Configurable pause duration (1-3s)
  confidenceThreshold?: number; // Confidence threshold for auto-send
  interruptionSensitivity?: number; // Volume threshold for interruption detection
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

  // Refs for audio processing and recognition
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const backgroundRecognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioProcessingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);

  // Echo cancellation and noise suppression
  const echoCancellationRef = useRef<boolean>(true);
  const noiseSuppression = useRef<boolean>(true);

  // Initialize speech recognition support check
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    setHasPermission(true); // Assume permission for now, will be checked when needed
  }, []);

  // Update voice state and notify parent
  const updateVoiceState = useCallback((newState: VoiceState) => {
    setVoiceState(newState);
    onStateChange(newState);
  }, [onStateChange]);

  // Simplified audio setup - just get permission, no complex audio processing
  const setupAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Clean up immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Failed to get microphone permission:', error);
      return false;
    }
  }, []);

  // Simplified audio monitoring - just show basic activity
  const startAudioMonitoring = useCallback(() => {
    // Simple animation for audio level without complex processing
    const animateAudioLevel = () => {
      if (isListening) {
        setAudioLevel(0.3 + Math.random() * 0.4); // Simple animation
      } else {
        setAudioLevel(0);
      }
    };
    
    audioProcessingIntervalRef.current = setInterval(animateAudioLevel, 100);
  }, [isListening]);

  // Removed complex recognition setup - now handled inline in startListening

  // Simplified interruption - no background recognition for now
  // This was causing conflicts with the main recognition

  // Start listening function
  const startListening = useCallback(async (): Promise<boolean> => {
    if (!isSupported || disabled) return false;

    // Stop any existing recognition first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Error stopping existing recognition:', error);
      }
      recognitionRef.current = null;
    }

    try {
      // Setup audio context first
      const audioSetup = await setupAudioContext();
      if (!audioSetup) return false;

      // Create simple recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true; // Keep listening for longer
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        console.log('✅ Speech recognition ACTUALLY started');
        console.log('Setting listening state to TRUE');
        setIsListening(true);
        updateVoiceState('listening');
        startAudioMonitoring();
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        console.log('🎤 SPEECH DETECTED! Event results:', event.results.length);
        
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log(`Result ${i}: "${transcript}" (final: ${event.results[i].isFinal})`);
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = finalTranscript + interimTranscript;
        console.log('📝 UPDATING TRANSCRIPT:', { fullTranscript, interim: interimTranscript, final: finalTranscript });
        
        // Update transcript immediately for real-time display
        setCurrentTranscript(fullTranscript);
        setConfidence(event.results[event.results.length - 1][0].confidence || 0.8);
        onTranscript(fullTranscript, interimTranscript.length > 0);
        
        // If this is a final result, start auto-send timer
        if (finalTranscript.trim()) {
          console.log('🚀 Final transcript detected:', finalTranscript);
          
          // Clear any existing timeout
          if (autoSendTimeoutRef.current) {
            clearTimeout(autoSendTimeoutRef.current);
          }
          
          // Set auto-send after pause
          autoSendTimeoutRef.current = setTimeout(() => {
            console.log('🚀 Auto-sending after pause:', fullTranscript.trim());
            onAutoSend(fullTranscript.trim());
            setCurrentTranscript('');
          }, autoSendDelay);
        }
        // For interim results, also set a timeout
        else if (interimTranscript.trim() && fullTranscript.length > 3) {
          // Clear any existing timeout
          if (autoSendTimeoutRef.current) {
            clearTimeout(autoSendTimeoutRef.current);
          }
          
          // Set longer timeout for interim results
          autoSendTimeoutRef.current = setTimeout(() => {
            console.log('🚀 Auto-sending interim result:', fullTranscript.trim());
            onAutoSend(fullTranscript.trim());
            setCurrentTranscript('');
          }, autoSendDelay + 1000); // Longer delay for interim
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // Don't stop on 'no-speech' error - just keep listening
        if (event.error === 'no-speech') {
          console.log('⏳ No speech detected, continuing to listen...');
          // Don't change state, keep listening
          return;
        }
        
        setIsListening(false);
        updateVoiceState('idle');
      };

      recognitionRef.current.onend = () => {
        console.log('🛑 Speech recognition ended');
        console.log('Current transcript before end:', currentTranscript);
        setIsListening(false);
        updateVoiceState('idle');
        setAudioLevel(0);
        if (audioProcessingIntervalRef.current) {
          clearInterval(audioProcessingIntervalRef.current);
        }
      };

      // Start recognition
      console.log('🚀 STARTING SPEECH RECOGNITION...');
      recognitionRef.current.start();
      console.log('🚀 Speech recognition start() called');
      
      updateVoiceState('listening');
      return true;
    } catch (error) {
      console.error('Failed to start listening:', error);
      updateVoiceState('idle');
      return false;
    }
  }, [isSupported, disabled, setupAudioContext, startAudioMonitoring, updateVoiceState, onTranscript, onAutoSend, autoSendDelay]);

  // Stop listening function
  const stopListening = useCallback(() => {
    // Clear timeouts
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }

    if (audioProcessingIntervalRef.current) {
      clearInterval(audioProcessingIntervalRef.current);
      audioProcessingIntervalRef.current = null;
    }

    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Background recognition removed

    // Simplified cleanup - no complex audio context to clean up

    setIsListening(false);
    setCurrentTranscript('');
    setAudioLevel(0);
    updateVoiceState('idle');
  }, [updateVoiceState]);

  // Toggle listening
  const toggleListening = useCallback(async (): Promise<boolean> => {
    if (isListening) {
      stopListening();
      return false;
    } else {
      return await startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Simple interrupt AI function
  const interruptAI = useCallback(() => {
    console.log('🛑 Interrupting AI response');
    updateVoiceState('interrupted');
    onInterrupt();
  }, [updateVoiceState, onInterrupt]);

  // Removed background recognition for now - was causing conflicts

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

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