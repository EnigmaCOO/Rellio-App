
import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'ai_speaking' | 'interrupted';

export interface SimplifiedVoiceHandlerProps {
  onMessage: (text: string) => void;
  onInterrupt: () => void;
  disabled?: boolean;
  autoSendDelay?: number;
  confidenceThreshold?: number;
}

export interface SimplifiedVoiceHandlerReturn {
  voiceState: VoiceState;
  currentTranscript: string;
  confidence: number;
  audioLevel: number;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
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

export function useSimplifiedVoiceHandler({
  onMessage,
  onInterrupt,
  disabled = false,
  autoSendDelay = 1500,
  confidenceThreshold = 0.7
}: SimplifiedVoiceHandlerProps): SimplifiedVoiceHandlerReturn {
  
  // Core state
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isInitializingRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);

  // Check support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false));
    }
  }, []);

  // Initialize audio context for monitoring
  const initializeAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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

      // Monitor audio levels
      const monitorAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);

          // Simple interruption detection - only during AI speech
          if (voiceState === 'ai_speaking' && average > 80) {
            console.log('🚨 User interruption detected - stopping AI');
            interruptAI();
          }
        }
        requestAnimationFrame(monitorAudioLevel);
      };
      
      monitorAudioLevel();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      setHasPermission(false);
    }
  }, [voiceState]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up voice handler');
    
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
      recognitionRef.current = null;
    }

    setCurrentTranscript('');
    setConfidence(0);
    setAudioLevel(0);
    
    if (voiceState !== 'ai_speaking') {
      setVoiceState('idle');
    }
  }, [voiceState]);

  // Start listening
  const startListening = useCallback(async (): Promise<boolean> => {
    console.log('🎤 Starting voice recognition');
    
    if (!isSupported || disabled || isInitializingRef.current) {
      return false;
    }

    // Don't start if AI is speaking
    if (voiceState === 'ai_speaking') {
      console.log('🚫 Cannot start - AI is speaking');
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
        setVoiceState('listening');
        isInitializingRef.current = false;
      };

      recognition.onresult = (event: any) => {
        // Block if AI is speaking
        if (voiceState === 'ai_speaking') {
          console.log('🚫 Blocking transcript - AI is speaking');
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
          }
        }
        
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        
        setCurrentTranscript(fullTranscript);
        setConfidence(maxConfidence);
        
        // Auto-send logic - only on final results with good confidence
        if (finalTranscript.trim() && maxConfidence >= confidenceThreshold) {
          console.log('🚀 Preparing auto-send:', finalTranscript.trim());
          
          // Clear existing timeout
          if (autoSendTimeoutRef.current) {
            clearTimeout(autoSendTimeoutRef.current);
          }

          // Wait for silence before sending
          autoSendTimeoutRef.current = setTimeout(() => {
            const message = finalTranscript.trim();
            if (message && voiceState === 'listening') {
              console.log('📤 Sending voice message:', message);
              setVoiceState('processing');
              setCurrentTranscript('');
              onMessage(message);
              
              // Reset to idle after processing
              setTimeout(() => {
                if (voiceState !== 'ai_speaking') {
                  setVoiceState('idle');
                }
              }, 500);
            }
          }, autoSendDelay);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('🎤 Recognition error:', event.error);
        isInitializingRef.current = false;
        
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          cleanup();
        }
      };

      recognition.onend = () => {
        console.log('🛑 Recognition ended');
        isInitializingRef.current = false;
        
        if (voiceState === 'listening') {
          setVoiceState('idle');
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
  }, [isSupported, disabled, voiceState, autoSendDelay, confidenceThreshold, onMessage, cleanup]);

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('🛑 Stopping listening');
    cleanup();
  }, [cleanup]);

  // Set AI speaking state
  const setAISpeaking = useCallback((speaking: boolean) => {
    console.log('🤖 AI speaking state:', speaking);
    
    if (speaking) {
      // Stop recognition when AI starts speaking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Failed to stop recognition for AI speech:', error);
        }
      }
      setVoiceState('ai_speaking');
      setCurrentTranscript(''); // Clear transcript when AI speaks
    } else {
      if (voiceState === 'ai_speaking') {
        setVoiceState('idle');
      }
    }
  }, [voiceState]);

  // Interrupt AI
  const interruptAI = useCallback(() => {
    console.log('🚨 Interrupting AI');
    setVoiceState('interrupted');
    onInterrupt();
    
    // Start listening after interruption
    setTimeout(() => {
      startListening();
    }, 300);
  }, [onInterrupt, startListening]);

  // Initialize audio context on mount
  useEffect(() => {
    if (hasPermission) {
      initializeAudioContext();
    }
    
    return () => {
      cleanup();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [hasPermission, initializeAudioContext, cleanup]);

  return {
    voiceState,
    currentTranscript,
    confidence,
    audioLevel,
    startListening,
    stopListening,
    setAISpeaking,
    isSupported,
    hasPermission,
    interruptAI
  };
}
