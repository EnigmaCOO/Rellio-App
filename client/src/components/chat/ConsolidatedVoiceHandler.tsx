
import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'ai_speaking' | 'interrupted';

export interface ConsolidatedVoiceHandlerProps {
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

export interface ConsolidatedVoiceHandlerReturn {
  isListening: boolean;
  currentTranscript: string;
  confidence: number;
  voiceState: VoiceState;
  audioLevel: number;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  toggleListening: () => Promise<boolean>;
  setAISpeaking: (speaking: boolean) => void;
  isSupported: boolean;
  hasPermission: boolean;
  interruptAI: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useConsolidatedVoiceHandler({
  onTranscript,
  onAutoSend,
  onStateChange,
  onInterrupt,
  disabled = false,
  isAIResponding = false,
  autoSendDelay = 1500,
  confidenceThreshold = 0.8,
  interruptionSensitivity = 0.3
}: ConsolidatedVoiceHandlerProps): ConsolidatedVoiceHandlerReturn {
  
  // Core state
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Refs for managing instances and timeouts
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const isInitializingRef = useRef(false);

  // Check support and permissions on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false));
    }
  }, []);

  const updateVoiceState = useCallback((newState: VoiceState) => {
    console.log('🎤 State change:', voiceState, '->', newState);
    setVoiceState(newState);
    onStateChange(newState);
  }, [voiceState, onStateChange]);

  // Initialize audio context for level monitoring and interruption detection
  const initializeAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        } 
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Monitor audio levels and interruption
      const monitorAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);

          // Interruption detection during AI speech
          if (voiceState === 'ai_speaking' && average > (interruptionSensitivity * 255)) {
            console.log('🚨 User interruption detected during AI speech');
            updateVoiceState('interrupted');
            onInterrupt();
            setTimeout(() => startListening(), 500);
          }
        }
        if (isListening || voiceState === 'ai_speaking') {
          requestAnimationFrame(monitorAudioLevel);
        }
      };
      
      monitorAudioLevel();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      setHasPermission(false);
    }
  }, [isListening, voiceState, interruptionSensitivity, updateVoiceState, onInterrupt]);

  // Enhanced cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up voice handler');
    
    // Clear all timeouts
    [autoSendTimeoutRef, debounceTimeoutRef, silenceDetectionRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });

    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        console.warn('Error aborting recognition:', error);
      }
      recognitionRef.current = null;
    }

    // Clean up audio context
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
    setConfidence(0);
    lastSpeechTimeRef.current = 0;
    
    if (voiceState !== 'ai_speaking') {
      updateVoiceState('idle');
    }
  }, [voiceState, updateVoiceState]);

  // Enhanced silence detection with sliding window
  const handleSilenceDetection = useCallback((transcript: string, confidence: number) => {
    console.log('🔊 Silence detection - transcript:', transcript, 'confidence:', confidence);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (confidence < confidenceThreshold) {
      console.log('⚠️ Confidence too low for auto-send:', confidence);
      return;
    }

    // Debounce to filter noise-induced pauses
    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🎯 Debounce completed, checking for sustained silence...');
      
      if (silenceDetectionRef.current) {
        clearTimeout(silenceDetectionRef.current);
      }
      
      // Sliding window for sustained silence
      const silenceWindow = Math.random() * 1000 + 1000;
      
      silenceDetectionRef.current = setTimeout(() => {
        const now = Date.now();
        const timeSinceLastSpeech = now - lastSpeechTimeRef.current;
        
        if (timeSinceLastSpeech >= 1000 && transcript.trim()) {
          console.log('🚀 Auto-send confirmed');
          
          setCurrentTranscript('');
          setIsListening(false);
          updateVoiceState('processing');
          
          onAutoSend(transcript.trim());
          
          setTimeout(() => {
            if (voiceState !== 'ai_speaking') {
              updateVoiceState('idle');
            }
          }, 500);
        }
      }, silenceWindow);
    }, 300);
  }, [confidenceThreshold, onAutoSend, updateVoiceState, voiceState]);

  // Start listening with enhanced error handling
  const startListening = useCallback(async (): Promise<boolean> => {
    console.log('🎤 Starting listening...');
    
    if (!isSupported || disabled || isInitializingRef.current) {
      return false;
    }

    // Block if AI is speaking (unless recovering from interruption)
    if (voiceState === 'ai_speaking' && voiceState !== 'interrupted') {
      console.log('🚫 Blocked: AI is speaking');
      return false;
    }

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
        isInitializingRef.current = false;
        
        // Initialize audio monitoring
        initializeAudioContext();
      };

      recognition.onresult = (event: any) => {
        // Block during AI speech (except interruption recovery)
        if (voiceState === 'ai_speaking' && voiceState !== 'interrupted') {
          return;
        }

        let finalTranscript = '';
        let interimTranscript = '';
        let maxConfidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          const resultConfidence = event.results[i][0].confidence || 0.8;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            maxConfidence = Math.max(maxConfidence, resultConfidence);
            lastSpeechTimeRef.current = Date.now();
          } else {
            interimTranscript += transcript + ' ';
            lastSpeechTimeRef.current = Date.now();
          }
        }
        
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        
        setCurrentTranscript(fullTranscript);
        setConfidence(maxConfidence);
        onTranscript(fullTranscript, interimTranscript.length > 0);
        
        // Auto-send logic with enhanced silence detection
        if (finalTranscript.trim()) {
          handleSilenceDetection(finalTranscript.trim(), maxConfidence);
        }
      };

      recognition.onspeechend = () => {
        console.log('🗣️ Speech ended');
        const currentTranscriptValue = currentTranscript.trim();
        if (currentTranscriptValue && confidence >= confidenceThreshold) {
          handleSilenceDetection(currentTranscriptValue, confidence);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('🎤 Recognition error:', event.error);
        isInitializingRef.current = false;
        
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        
        cleanup();
      };

      recognition.onend = () => {
        console.log('🛑 Recognition ended');
        isInitializingRef.current = false;
        setIsListening(false);
        setAudioLevel(0);
        
        if (voiceState !== 'processing' && voiceState !== 'ai_speaking') {
          updateVoiceState('idle');
        }
      };

      recognition.start();
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start recognition:', error);
      isInitializingRef.current = false;
      cleanup();
      return false;
    }
  }, [isSupported, disabled, voiceState, cleanup, updateVoiceState, onTranscript, handleSilenceDetection, confidence, confidenceThreshold, currentTranscript, initializeAudioContext]);

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

  // Set AI speaking state with proper handling
  const setAISpeaking = useCallback((speaking: boolean) => {
    console.log('🤖 AI speaking state:', speaking);
    
    if (speaking) {
      updateVoiceState('ai_speaking');
      // Stop current recognition when AI starts speaking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Failed to stop recognition for AI speech:', error);
        }
      }
      setCurrentTranscript('');
    } else {
      if (voiceState === 'ai_speaking') {
        updateVoiceState('idle');
      }
    }
  }, [voiceState, updateVoiceState]);

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
    setAISpeaking,
    isSupported,
    hasPermission,
    interruptAI
  };
}
