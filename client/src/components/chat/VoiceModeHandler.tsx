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

  // Audio setup with permission check
  const setupAudioContext = useCallback(async () => {
    console.log('🎧 Setting up audio context and permissions...');
    try {
      // Check if we already have permission
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('🎧 Microphone permission status:', permissionStatus.state);
      }
      
      // Request microphone access
      console.log('🎧 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: echoCancellationRef.current,
          noiseSuppression: noiseSuppression.current,
          autoGainControl: true
        } 
      });
      
      console.log('🎧 ✅ Microphone access granted');
      
      // Store stream reference for cleanup
      streamRef.current = stream;
      setHasPermission(true);
      
      // Don't stop immediately - keep for monitoring
      return true;
    } catch (error) {
      console.error('🎧 ❌ Failed to get microphone permission:', error);
      setHasPermission(false);
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
    console.log('🎤 START LISTENING CALLED - Initial state:', { isSupported, disabled, hasPermission });
    
    if (!isSupported) {
      console.error('❌ Speech recognition not supported');
      return false;
    }
    
    if (disabled) {
      console.error('❌ Voice input is disabled');
      return false;
    }

    // Stop any existing recognition first
    if (recognitionRef.current) {
      console.log('🛑 Stopping existing recognition');
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Error stopping existing recognition:', error);
      }
      recognitionRef.current = null;
    }

    try {
      // Setup audio context first
      console.log('🔧 Setting up audio context...');
      const audioSetup = await setupAudioContext();
      if (!audioSetup) {
        console.error('❌ Failed to setup audio context');
        return false;
      }
      console.log('✅ Audio context setup successful');

      // Create simple recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error('❌ SpeechRecognition not available');
        return false;
      }
      
      console.log('🔧 Creating SpeechRecognition instance...');
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition settings
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      
      console.log('⚙️ Speech recognition configured:', {
        continuous: recognitionRef.current.continuous,
        interimResults: recognitionRef.current.interimResults,
        lang: recognitionRef.current.lang
      });

      // Set up event handlers
      recognitionRef.current.onstart = () => {
        console.log('🎤 ✅ SPEECH RECOGNITION STARTED!');
        setIsListening(true);
        updateVoiceState('listening');
        startAudioMonitoring();
        console.log('🎤 ✅ Listening state set to TRUE');
      };

      recognitionRef.current.onresult = (event: any) => {
        console.log('🎤 🗣️ SPEECH RESULT RECEIVED!');
        console.log('Event results length:', event.results.length);
        
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Process all results
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          
          console.log(`Result ${i}: "${transcript}" (final: ${result.isFinal}, confidence: ${confidence})`);
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = finalTranscript + interimTranscript;
        console.log('📝 FULL TRANSCRIPT:', { fullTranscript, final: finalTranscript, interim: interimTranscript });
        
        // IMMEDIATE UPDATE - This is key for real-time display
        console.log('🔄 UPDATING CURRENT TRANSCRIPT:', fullTranscript);
        setCurrentTranscript(fullTranscript);
        setConfidence(event.results[event.results.length - 1][0].confidence || 0.8);
        
        // Notify parent component
        onTranscript(fullTranscript, interimTranscript.length > 0);
        
        // Ensure visual feedback is active
        if (fullTranscript.trim()) {
          console.log('💫 Keeping visual state active for transcript:', fullTranscript.trim());
          setIsListening(true);
          updateVoiceState('listening');
        }
        
        // Auto-send final results
        if (finalTranscript.trim()) {
          console.log('🚀 FINAL RESULT DETECTED - Setting up auto-send for:', finalTranscript);
          
          // Clear existing timeout
          if (autoSendTimeoutRef.current) {
            clearTimeout(autoSendTimeoutRef.current);
            console.log('⏰ Cleared existing timeout');
          }
          
          // Set new timeout for auto-send
          autoSendTimeoutRef.current = setTimeout(() => {
            console.log('🚀 AUTO-SENDING MESSAGE:', finalTranscript.trim());
            onAutoSend(finalTranscript.trim());
            setCurrentTranscript('');
            setIsListening(false);
            updateVoiceState('idle');
          }, autoSendDelay);
          console.log(`⏰ Auto-send scheduled in ${autoSendDelay}ms`);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('🎤 ❌ SPEECH RECOGNITION ERROR:', event.error, event.message);
        
        // Handle different error types
        switch (event.error) {
          case 'no-speech':
            console.log('⏳ No speech detected - continuing to listen');
            return; // Don't stop listening
          case 'audio-capture':
            console.error('❌ Audio capture failed - microphone access issue');
            break;
          case 'not-allowed':
            console.error('❌ Microphone permission denied');
            break;
          default:
            console.error('❌ Other recognition error:', event.error);
        }
        
        setIsListening(false);
        updateVoiceState('idle');
      };

      recognitionRef.current.onend = () => {
        console.log('🛑 SPEECH RECOGNITION ENDED');
        
        // Only reset if we don't have active transcript
        if (!currentTranscript || !currentTranscript.trim()) {
          console.log('🔄 Resetting state - no active transcript');
          setIsListening(false);
          updateVoiceState('idle');
        } else {
          console.log('📝 Keeping state active - transcript present:', currentTranscript);
        }
        
        // Clean up audio monitoring
        setAudioLevel(0);
        if (audioProcessingIntervalRef.current) {
          clearInterval(audioProcessingIntervalRef.current);
        }
      };

      // Start recognition
      console.log('🚀 STARTING SPEECH RECOGNITION NOW...');
      recognitionRef.current.start();
      console.log('🚀 Speech recognition.start() executed');
      
      // Set initial state
      updateVoiceState('listening');
      setIsListening(true); // Optimistically set to true
      
      return true;
    } catch (error) {
      console.error('❌ CRITICAL ERROR starting speech recognition:', error);
      updateVoiceState('idle');
      setIsListening(false);
      return false;
    }
  }, [isSupported, disabled, setupAudioContext, startAudioMonitoring, updateVoiceState, onTranscript, onAutoSend, autoSendDelay, currentTranscript]);

  // Stop listening function
  const stopListening = useCallback(() => {
    console.log('🛑 STOP LISTENING CALLED');
    
    // Clear timeouts
    if (autoSendTimeoutRef.current) {
      console.log('⏰ Clearing auto-send timeout');
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }

    if (audioProcessingIntervalRef.current) {
      console.log('🔊 Clearing audio processing interval');
      clearInterval(audioProcessingIntervalRef.current);
      audioProcessingIntervalRef.current = null;
    }

    // Stop recognition
    if (recognitionRef.current) {
      console.log('🛑 Stopping speech recognition');
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
      recognitionRef.current = null;
    }

    // Clean up media stream
    if (streamRef.current) {
      console.log('📹 Cleaning up media stream');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Reset all states
    console.log('🔄 Resetting all voice states');
    setIsListening(false);
    setCurrentTranscript('');
    setAudioLevel(0);
    updateVoiceState('idle');
    setConfidence(0);
    
    console.log('🚀 Stop listening completed');
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