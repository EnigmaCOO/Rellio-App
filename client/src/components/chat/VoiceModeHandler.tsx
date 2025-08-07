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
    
    // Check for microphone permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false));
    }
  }, []);

  // Update voice state and notify parent
  const updateVoiceState = useCallback((newState: VoiceState) => {
    setVoiceState(newState);
    onStateChange(newState);
  }, [onStateChange]);

  // Setup audio context for real-time audio analysis and echo cancellation
  const setupAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: echoCancellationRef.current,
          noiseSuppression: noiseSuppression.current,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.3;

      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);

      return true;
    } catch (error) {
      console.error('Failed to setup audio context:', error);
      return false;
    }
  }, []);

  // Real-time audio level monitoring for interruption detection
  const startAudioMonitoring = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const processAudio = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS audio level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rmsLevel = Math.sqrt(sum / dataArray.length) / 255;
      setAudioLevel(rmsLevel);

      // Detect interruption during AI response
      if (isAIResponding && rmsLevel > interruptionSensitivity) {
        const now = Date.now();
        if (now - lastSpeechTimeRef.current > 500) { // Debounce interruptions
          console.log('🚨 Voice interruption detected:', rmsLevel);
          interruptAI();
          lastSpeechTimeRef.current = now;
        }
      }
    };

    audioProcessingIntervalRef.current = setInterval(processAudio, 50);
  }, [isAIResponding, interruptionSensitivity]);

  // Initialize primary speech recognition
  const setupPrimaryRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    // Note: maxAlternatives not supported in all browsers

    recognition.onstart = () => {
      console.log('🎤 Primary recognition started');
      setIsListening(true);
      updateVoiceState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const resultConfidence = event.results[i][0].confidence || 0;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          maxConfidence = Math.max(maxConfidence, resultConfidence);
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = (finalTranscript + interimTranscript).trim();
      setCurrentTranscript(fullTranscript);
      setConfidence(maxConfidence);
      onTranscript(fullTranscript, !finalTranscript);

      // Handle auto-send logic - more lenient for better reliability
      if (fullTranscript.length > 2) { // Any meaningful text
        // Clear existing timeout
        if (autoSendTimeoutRef.current) {
          clearTimeout(autoSendTimeoutRef.current);
        }

        // For final transcripts, send immediately after a short delay
        if (finalTranscript) {
          console.log('🎤 Final transcript received:', finalTranscript);
          updateVoiceState('processing');
          
          autoSendTimeoutRef.current = setTimeout(() => {
            console.log('🚀 Auto-sending final transcript:', finalTranscript.trim());
            onAutoSend(finalTranscript.trim());
            setCurrentTranscript('');
            updateVoiceState('idle');
          }, 500); // Shorter delay for final transcripts
        }
        // For interim transcripts, wait for the full pause
        else if (interimTranscript && (maxConfidence > 0.3 || maxConfidence === 0)) {
          console.log('🎤 Interim transcript:', interimTranscript);
          
          autoSendTimeoutRef.current = setTimeout(() => {
            console.log('🚀 Auto-sending after pause:', fullTranscript.trim());
            onAutoSend(fullTranscript.trim());
            setCurrentTranscript('');
            updateVoiceState('idle');
          }, autoSendDelay);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Primary recognition error:', event.error);
      setIsListening(false);
      updateVoiceState('idle');
      
      // Auto-retry on network errors
      if (event.error === 'network' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (!disabled) startListening();
        }, 2000);
      }
    };

    recognition.onend = () => {
      console.log('🎤 Primary recognition ended');
      setIsListening(false);
      
      // If we have a transcript that hasn't been sent yet, send it now
      if (currentTranscript.trim().length > 2 && !autoSendTimeoutRef.current) {
        console.log('🚀 Sending transcript on recognition end:', currentTranscript.trim());
        onAutoSend(currentTranscript.trim());
        setCurrentTranscript('');
      }
      
      updateVoiceState('idle');
    };

    return recognition;
  }, [isSupported, confidenceThreshold, autoSendDelay, disabled, onTranscript, onAutoSend, updateVoiceState, voiceState]);

  // Background speech recognition for interruption detection
  const setupBackgroundRecognition = useCallback(() => {
    if (!isSupported || !isAIResponding) return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const bgRecognition = new SpeechRecognition();

    bgRecognition.continuous = true;
    bgRecognition.interimResults = true;
    bgRecognition.lang = 'en-US';

    bgRecognition.onresult = (event: SpeechRecognitionEvent) => {
      // Any speech detected during AI response triggers interruption
      if (event.results.length > 0) {
        console.log('🚨 Background speech detected - interrupting AI');
        interruptAI();
      }
    };

    bgRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Background recognition error:', event.error);
    };

    return bgRecognition;
  }, [isSupported, isAIResponding]);

  // Start listening function
  const startListening = useCallback(async (): Promise<boolean> => {
    if (!isSupported || disabled) return false;

    try {
      // Setup audio context first
      const audioSetup = await setupAudioContext();
      if (!audioSetup) return false;

      // Setup primary recognition
      recognitionRef.current = setupPrimaryRecognition();
      if (!recognitionRef.current) return false;

      // Start audio monitoring
      startAudioMonitoring();

      // Start primary recognition
      recognitionRef.current.start();
      
      updateVoiceState('listening');
      return true;
    } catch (error) {
      console.error('Failed to start listening:', error);
      updateVoiceState('idle');
      return false;
    }
  }, [isSupported, disabled, setupAudioContext, setupPrimaryRecognition, startAudioMonitoring, updateVoiceState]);

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

    if (backgroundRecognitionRef.current) {
      backgroundRecognitionRef.current.stop();
      backgroundRecognitionRef.current = null;
    }

    // Cleanup audio context
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

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

  // Interrupt AI function
  const interruptAI = useCallback(() => {
    console.log('🛑 Interrupting AI response');
    updateVoiceState('interrupted');
    onInterrupt();
    
    // Start listening immediately after interruption
    setTimeout(() => {
      if (!disabled) startListening();
    }, 500);
  }, [updateVoiceState, onInterrupt, disabled, startListening]);

  // Setup background recognition when AI is responding
  useEffect(() => {
    if (isAIResponding && !disabled) {
      backgroundRecognitionRef.current = setupBackgroundRecognition();
      if (backgroundRecognitionRef.current) {
        try {
          backgroundRecognitionRef.current.start();
        } catch (error) {
          console.warn('Could not start background recognition:', error);
        }
      }
    } else {
      if (backgroundRecognitionRef.current) {
        backgroundRecognitionRef.current.stop();
        backgroundRecognitionRef.current = null;
      }
    }

    return () => {
      if (backgroundRecognitionRef.current) {
        backgroundRecognitionRef.current.stop();
        backgroundRecognitionRef.current = null;
      }
    };
  }, [isAIResponding, disabled, setupBackgroundRecognition]);

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