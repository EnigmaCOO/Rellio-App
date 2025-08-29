import { useReducer, useEffect, useRef, useCallback, useState } from 'react';

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
  voiceId?: string;
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
  // ElevenLabs TTS integration
  playText: (text: string) => Promise<void>;
  stopPlayback: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  setVolume: (volume: number) => void;
  // Browser info for better UI messaging
  browserInfo: {
    isChrome: boolean;
    isEdge: boolean;
    isSafari: boolean;
    isFirefox: boolean;
    name: string;
  };
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Enhanced state management with useReducer
interface VoiceStateData {
  voiceState: VoiceState;
  isListening: boolean;
  currentTranscript: string;
  confidence: number;
  audioLevel: number;
  isSupported: boolean;
  hasPermission: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  lastRequestTime: number;
  lastAutoPlayTime: number;
}

type VoiceAction =
  | { type: 'SET_STATE'; payload: VoiceState }
  | { type: 'SET_LISTENING'; payload: boolean }
  | { type: 'SET_TRANSCRIPT'; payload: { text: string; confidence: number } }
  | { type: 'SET_AUDIO_LEVEL'; payload: number }
  | { type: 'SET_SUPPORT'; payload: { supported: boolean; permission: boolean } }
  | { type: 'SET_TTS_STATE'; payload: { playing: boolean; loading: boolean } }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'UPDATE_REQUEST_TIME'; payload: number }
  | { type: 'UPDATE_AUTOPLAY_TIME'; payload: number }
  | { type: 'RESET'; payload?: Partial<VoiceStateData> };

const initialState: VoiceStateData = {
  voiceState: 'idle',
  isListening: false,
  currentTranscript: '',
  confidence: 0,
  audioLevel: 0,
  isSupported: false,
  hasPermission: false,
  isPlaying: false,
  isLoading: false,
  volume: 0.8,
  lastRequestTime: 0,
  lastAutoPlayTime: 0,
};

function voiceReducer(state: VoiceStateData, action: VoiceAction): VoiceStateData {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, voiceState: action.payload };
    case 'SET_LISTENING':
      return { ...state, isListening: action.payload };
    case 'SET_TRANSCRIPT':
      return {
        ...state,
        currentTranscript: action.payload.text,
        confidence: action.payload.confidence
      };
    case 'SET_AUDIO_LEVEL':
      return { ...state, audioLevel: action.payload };
    case 'SET_SUPPORT':
      return {
        ...state,
        isSupported: action.payload.supported,
        hasPermission: action.payload.permission
      };
    case 'SET_TTS_STATE':
      return {
        ...state,
        isPlaying: action.payload.playing,
        isLoading: action.payload.loading
      };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'UPDATE_REQUEST_TIME':
      return { ...state, lastRequestTime: action.payload };
    case 'UPDATE_AUTOPLAY_TIME':
      return { ...state, lastAutoPlayTime: action.payload };
    case 'RESET':
      return { ...initialState, ...action.payload };
    default:
      return state;
  }
}

export function useVoiceModeHandler({
  onTranscript,
  onAutoSend,
  onStateChange,
  onInterrupt,
  disabled = false,
  isAIResponding = false,
  autoSendDelay = 800,
  confidenceThreshold = 0.6,
  interruptionSensitivity = 0.2,
  voiceId = 'ErXwobaYiN019PkySvjV'
}: VoiceModeHandlerProps): VoiceModeHandlerReturn {

  // Enhanced state management with useReducer
  const [state, dispatch] = useReducer(voiceReducer, initialState);

  // Add error boundary protection
  const [hasError, setHasError] = useState(false);

  // Reset error state when disabled changes
  useEffect(() => {
    if (disabled) {
      setHasError(false);
    }
  }, [disabled]);

  // Enhanced refs for managing instances and timeouts
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isInitializingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRequestRef = useRef<string | null>(null);
  const elevenLabsStreamingRef = useRef<any>(null); // For ElevenLabs TTS

  // Simplified and more permissive support check
  useEffect(() => {
    const checkSupportAndPermissions = async () => {
      try {
        const userAgent = navigator.userAgent.toLowerCase();
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        console.log('🔍 Checking voice support:', { 
          userAgent: userAgent.substring(0, 50), 
          hasSpeechAPI: !!SpeechRecognition 
        });

        // More permissive browser support - if the API exists, allow it
        const supported = !!SpeechRecognition;
        
        if (supported) {
          console.log('✅ Speech Recognition API found - voice input enabled');
        } else {
          console.log('❌ Speech Recognition API not found');
        }

        // Don't check permissions upfront - let user trigger the permission request
        const hasPermission = false; // Will be checked when user actually clicks

        console.log('🎤 Voice system initialized:', { supported, hasPermission });
        dispatch({ type: 'SET_SUPPORT', payload: { supported, permission: hasPermission } });
      } catch (error) {
        console.error('🚨 Voice support check failed:', error);
        // More permissive fallback
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        dispatch({ type: 'SET_SUPPORT', payload: { supported: !!SpeechRecognition, permission: false } });
      }
    };

    checkSupportAndPermissions();
  }, []);

  const updateVoiceState = useCallback((newState: VoiceState) => {
    if (!hasError) { // Only update if not in an error state
      dispatch({ type: 'SET_STATE', payload: newState });
      // Call onStateChange without making it a dependency to prevent loops
      try {
        onStateChange(newState);
      } catch (error) {
        console.error('🚨 State change callback error:', error);
      }
    }
  }, [hasError]); // Remove onStateChange from dependencies

  // Fast cleanup function - STABLE with minimal dependencies
  const cleanup = useCallback(() => {
    console.log('🎤 Voice handler cleanup');
    try {
      // Clear all timeouts
      [autoSendTimeoutRef, debounceTimeoutRef, silenceDetectionRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });

      // Stop main recognition
      if (recognitionRef.current) {
        try {
          // Stop background recognition if it exists
          if (recognitionRef.current.backgroundRecognition) {
            recognitionRef.current.backgroundRecognition.abort();
            recognitionRef.current.backgroundRecognition = null;
          }

          recognitionRef.current.abort();
          recognitionRef.current = null;
        } catch (error) {
          console.warn('🚨 Error aborting recognition:', error);
        }
      }

      // Clean up audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Clean up media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Stop TTS audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      // Clear any pending TTS
      if (elevenLabsStreamingRef.current?.stopPlayback) {
        elevenLabsStreamingRef.current.stopPlayback();
      }

      dispatch({ type: 'SET_LISTENING', payload: false });
      dispatch({ type: 'SET_STATE', payload: 'idle' });
    } catch (error) {
      console.error('🚨 Cleanup error:', error);
      setHasError(true);
    }
  }, []); // NO dependencies to prevent infinite loops

  // Enhanced audio context initialization with maximum echo cancellation
  const initializeAudioContext = useCallback(async () => {
    if (audioContextRef.current || isInitializingRef.current || hasError) return;

    try {
      isInitializingRef.current = true;
      console.log('🔧 Initializing enhanced audio context with maximum echo cancellation...');

      // Request microphone with MAXIMUM isolation constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { exact: true },
          noiseSuppression: { exact: true },
          autoGainControl: false,
          sampleRate: 16000,
          channelCount: 1,
          sampleSize: 16
        }
      });
      streamRef.current = stream;

      console.log('🎤 Audio stream initialized with echo cancellation');

      // Enhanced Audio Context with Isolation Controls
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create enhanced gain control for AI speech isolation
      const gainNode = audioContext.createGain();
      gainNode.gain.value = isAIResponding ? 0 : 1; // Mute mic during AI speech
      gainNodeRef.current = gainNode;

      // Audio processing chain: Microphone -> Gain Control -> Analyser
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(gainNode);
      gainNode.connect(analyser);

      monitorAudioLevel();
    } catch (error) {
      console.error('🚨 Audio context initialization error:', error);
      setHasError(true);
    } finally {
      isInitializingRef.current = false;
    }
  }, [isAIResponding, hasError]);

  // Enhanced audio level monitoring with interruption detection
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || hasError) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      if (!analyser || hasError) return;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

      dispatch({ type: 'SET_AUDIO_LEVEL', payload: average });

      // Enhanced interruption detection (backup to onspeechstart)
      if ((state.voiceState === 'speaking' || isAIResponding) && average > 50) {
        console.log('🚨 AUDIO-LEVEL INTERRUPTION! High audio detected during AI speech');
        interruptAI();
      }

      requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, [state.voiceState, isAIResponding, hasError]);

  // Simplified duplicate prevention - only block rapid successive identical requests
  const isDuplicateRequest = useCallback((text: string): boolean => {
    const now = Date.now();
    const timeSinceLastRequest = now - state.lastRequestTime;

    // Only block if same request within 1 second
    if (timeSinceLastRequest < 1000) {
      console.log('⏱️ Duplicate prevention: Too soon since last request');
      return true;
    }

    return false;
  }, [state.lastRequestTime]);

  // Simplified auto-play control - only block during TTS playback
  const canAutoPlay = useCallback((): boolean => {
    // Only block if TTS is currently playing to prevent feedback
    if (state.isPlaying) {
      console.log('🔊 Auto-play blocked: TTS currently playing');
      return false;
    }

    console.log('✅ Auto-play allowed - Voice state:', state.voiceState);
    return true;
  }, [state.isPlaying]);

  // Simplified startListening without permission pre-checks
  const startListening = useCallback(async (): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🎤 Starting listening...');

        if (disabled || state.isListening || hasError) {
          console.log('🚫 Voice input disabled, already listening, or in error state');
          resolve(false);
          return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          console.error('🚫 Speech Recognition API not available');
          resolve(false);
          return;
        }

        // Initialize audio context for isolation
        console.log('🔊 Initializing audio context...');
        await initializeAudioContext();

        console.log('🎤 Creating new SpeechRecognition instance...');
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

          // Enhanced Grok-like configuration for optimal voice interaction
          recognition.continuous = true; // Keep listening for multiple phrases
          recognition.interimResults = true; // Show real-time transcription like Grok
          recognition.lang = 'en-US';
          recognition.maxAlternatives = 1; // Focus on most likely result for speed

          // Additional browser-specific optimizations
          if ('grammars' in recognition) {
            // Add spiritual/religious terms for better recognition
            try {
              const grammar = '#JSGF V1.0; grammar spiritual; public <spiritual> = bible | scripture | prayer | meditation | karma | dharma | allah | buddha | jesus | torah | quran | bhagavad | gita;';
              const speechRecognitionList = new (window as any).SpeechGrammarList();
              speechRecognitionList.addFromString(grammar, 1);
              recognition.grammars = speechRecognitionList;
            } catch (e) {
              console.log('📝 Speech grammars not supported, using default recognition');
            }
          }

          let finalTranscript = '';
          let isProcessingFinal = false;

          recognition.onstart = () => {
            try {
              console.log('✅ Recognition started');
              dispatch({ type: 'SET_LISTENING', payload: true });
              updateVoiceState('listening');
              resolve(true);
            } catch (error) {
              console.error('🚨 Recognition start error:', error);
              setHasError(true);
              resolve(false);
            }
          };

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            try {
              let interimTranscript = '';

              for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript.trim();
                const confidence = result[0].confidence || 0.8; // Default confidence for browsers that don't report it

                if (result.isFinal) {
                  finalTranscript += transcript + ' ';
                  const cleanFinalTranscript = finalTranscript.trim();

                  console.log('✅ FINAL transcript received:', cleanFinalTranscript, 'confidence:', confidence);

                  // Always update transcript state for display
                  dispatch({
                    type: 'SET_TRANSCRIPT',
                    payload: { text: cleanFinalTranscript, confidence }
                  });
                  onTranscript(cleanFinalTranscript, false);

                  // Clear any existing auto-send timeout
                  if (autoSendTimeoutRef.current) {
                    clearTimeout(autoSendTimeoutRef.current);
                    autoSendTimeoutRef.current = null;
                  }

                  // Enhanced auto-send with better conditions
                  if (!isProcessingFinal && cleanFinalTranscript.length > 2 && confidence >= confidenceThreshold) {
                    isProcessingFinal = true;

                    console.log('🚀 AUTO-SEND triggered for:', cleanFinalTranscript);

                    // Immediate auto-send for better responsiveness
                    autoSendTimeoutRef.current = setTimeout(() => {
                      try {
                        console.log('📤 SENDING voice message:', cleanFinalTranscript);
                        dispatch({ type: 'UPDATE_REQUEST_TIME', payload: Date.now() });
                        onAutoSend(cleanFinalTranscript);
                        updateVoiceState('processing');

                        // Clear transcript after sending
                        dispatch({
                          type: 'SET_TRANSCRIPT',
                          payload: { text: '', confidence: 0 }
                        });

                        cleanup(); // Stop listening after auto-send
                      } catch (error) {
                        console.error('🚨 Auto-send timeout error:', error);
                        setHasError(true);
                      }
                    }, 500); // Slightly longer delay to ensure completion
                  } else {
                    console.log('⚠️ Auto-send skipped:', {
                      isProcessingFinal,
                      textLength: cleanFinalTranscript.length,
                      hasText: !!cleanFinalTranscript,
                      confidence,
                      threshold: confidenceThreshold
                    });
                  }
                } else {
                  // Show interim results for immediate feedback
                  interimTranscript += transcript;
                  console.log('🎤 INTERIM transcript:', interimTranscript);

                  // Always show interim transcripts for user feedback
                  dispatch({
                    type: 'SET_TRANSCRIPT',
                    payload: { text: interimTranscript, confidence }
                  });
                  onTranscript(interimTranscript, true);
                }
              }
            } catch (error) {
              console.error('🚨 Recognition result processing error:', error);
              setHasError(true);
              cleanup();
            }
          };

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('🚨 Recognition error:', event.error);

            if (event.error === 'not-allowed') {
              dispatch({ type: 'SET_SUPPORT', payload: { supported: state.isSupported, permission: false } });
            }
            setHasError(true);
            cleanup();
            resolve(false);
          };

          recognition.onend = () => {
            console.log('🛑 Recognition ended');
            dispatch({ type: 'SET_LISTENING', payload: false });

            if (state.voiceState === 'listening') {
              updateVoiceState('idle');
            }

            recognitionRef.current = null;
          };

          recognition.start();
        
      } catch (error) {
        console.error('🚨 Start listening error:', error);
        setHasError(true);
        // Direct cleanup to avoid dependency
        if (recognitionRef.current) {
          recognitionRef.current.abort();
          recognitionRef.current = null;
        }
        dispatch({ type: 'SET_LISTENING', payload: false });
        dispatch({ type: 'SET_STATE', payload: 'idle' });
        resolve(false);
      }
    });
  }, [
    disabled,
    hasError
  ]); // Minimal dependencies to prevent loops

  const stopListening = useCallback(() => {
    console.log('🛑 Stopping listening');
    // Call cleanup directly to avoid dependency issues
    try {
      // Clear all timeouts
      [autoSendTimeoutRef, debounceTimeoutRef, silenceDetectionRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });

      // Stop recognition
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }

      dispatch({ type: 'SET_LISTENING', payload: false });
      dispatch({ type: 'SET_STATE', payload: 'idle' });
    } catch (error) {
      console.error('🚨 Stop listening error:', error);
    }
  }, []); // No dependencies

  const toggleListening = useCallback(async (): Promise<boolean> => {
    console.log('🎤 TOGGLE LISTENING - Current state:', {
      listening: state.isListening,
      supported: state.isSupported,
      hasPermission: state.hasPermission,
      disabled,
      hasError
    });

    // If already listening, stop
    if (state.isListening) {
      console.log('🛑 Stopping listening...');
      stopListening();
      return false;
    }

    // Reset any previous errors
    if (hasError) {
      console.log('🔄 Resetting error state...');
      setHasError(false);
    }

    // Check API availability
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('🚨 Speech Recognition API not available');
      return false;
    }

    // Update support if not already set
    if (!state.isSupported) {
      dispatch({ type: 'SET_SUPPORT', payload: { supported: true, permission: false } });
    }

    // Request permission and start listening
    console.log('🎤 Requesting microphone permission and starting...');
    try {
      const result = await startListening();
      if (result) {
        // Update permission state on successful start
        dispatch({ type: 'SET_SUPPORT', payload: { supported: true, permission: true } });
      }
      return result;
    } catch (error) {
      console.error('🚨 Failed to start listening:', error);
      return false;
    }
  }, [state.isListening, state.isSupported, state.hasPermission, disabled, hasError, stopListening, startListening]);

  // Interrupt AI with enhanced controls
  const interruptAI = useCallback(() => {
    console.log('🚨 Interrupting AI');

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
    updateVoiceState('interrupted');
    onInterrupt();
  }, [updateVoiceState, onInterrupt]);

  // Grok-style background listening for interruption during AI speech
  const startBackgroundListening = useCallback(async (): Promise<void> => {
    if (!state.isSupported || !state.hasPermission || hasError) return;

    try {
      console.log('🎤 Starting background listening for interruption detection...');
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const backgroundRecognition = new SpeechRecognition();

      // Configure for interruption detection (low sensitivity)
      backgroundRecognition.continuous = true;
      backgroundRecognition.interimResults = true;
      backgroundRecognition.lang = 'en-US';

      backgroundRecognition.onstart = () => {
        console.log('🎤 Background listening started for interruption');
      };

      backgroundRecognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript.trim();
          const confidence = result[0].confidence || 0.8;

          // Grok-style interruption: even interim results can trigger interruption
          if (transcript.length > 3 && confidence > 0.3) {
            console.log('🚨 GROK-STYLE INTERRUPTION DETECTED:', transcript, 'confidence:', confidence);
            backgroundRecognition.stop();
            interruptAI();

            // Start new listening session with the interrupting text
            setTimeout(() => {
              dispatch({ type: 'SET_TRANSCRIPT', payload: { text: transcript, confidence } });
              onTranscript(transcript, false);

              // Auto-send the interrupting text
              if (confidence > 0.6) {
                console.log('🚀 Auto-sending interruption:', transcript);
                onAutoSend(`You interrupted to say: "${transcript}". `);
              }
            }, 100);
            break;
          }
        }
      };

      backgroundRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.log('🎤 Background recognition error (normal during interruption):', event.error);
      };

      backgroundRecognition.start();

      // Store reference for cleanup
      if (recognitionRef.current) {
        recognitionRef.current.backgroundRecognition = backgroundRecognition;
      }

    } catch (error) {
      console.error('🚨 Could not start background listening:', error);
      setHasError(true);
    }
  }, [state.isSupported, state.hasPermission, interruptAI, onTranscript, onAutoSend, hasError]);

  // Enhanced ElevenLabs TTS integration with Grok-like interruption
  const playText = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || hasError) return;

    try {
      console.log('🔊 Playing text with ElevenLabs + Grok-style interruption:', text.substring(0, 50) + '...');

      // Check auto-play permissions
      if (!canAutoPlay()) {
        console.log('🚫 Auto-play blocked by enhanced controls');
        return;
      }

      dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: true } });
      updateVoiceState('speaking');

      // Start background listening for Grok-style interruption
      setTimeout(() => startBackgroundListening(), 500); // Small delay to avoid self-interruption

      // Simple active request tracking
      if (activeRequestRef.current) {
        console.log('🔄 TTS already active, skipping duplicate');
        return;
      }

      const requestId = `${Date.now()}-${Math.random()}`;
      activeRequestRef.current = requestId;

      // Placeholder for ElevenLabs streaming integration
      // In a real scenario, this would involve a streaming API call
      // For now, simulate TTS response
      const simulatedAudioUrl = await simulateElevenLabsTTS(text, voiceId);
      const audio = new Audio(simulatedAudioUrl);
      audioRef.current = audio;
      audio.volume = state.volume;

      // Mute microphone during AI speech (enhanced isolation)
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 0;
      }

      audio.onloadstart = () => {
        dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: true } });
      };

      audio.oncanplaythrough = () => {
        dispatch({ type: 'SET_TTS_STATE', payload: { playing: true, loading: false } });
        dispatch({ type: 'UPDATE_AUTOPLAY_TIME', payload: Date.now() });
      };

      audio.onended = () => {
        console.log('🔊 TTS playback ended');
        dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
        updateVoiceState('idle');

        // Restore microphone gain
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = 1;
        }

        URL.revokeObjectURL(simulatedAudioUrl);
        audioRef.current = null;
        activeRequestRef.current = null;
      };

      audio.onerror = (error) => {
        console.error('🚨 TTS playback error:', error);
        dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
        updateVoiceState('idle');

        // Restore microphone gain
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = 1;
        }

        URL.revokeObjectURL(simulatedAudioUrl);
        audioRef.current = null;
        activeRequestRef.current = null;
        setHasError(true);
      };

      await audio.play();
    } catch (error) {
      console.error('🚨 TTS error:', error);
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
      updateVoiceState('idle');

      // Restore microphone gain on error
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 1;
      }

      activeRequestRef.current = null;
      setHasError(true);
    }
  }, [state.volume, voiceId, canAutoPlay, updateVoiceState, startBackgroundListening, hasError]);

  // Mock function to simulate ElevenLabs TTS response
  const simulateElevenLabsTTS = async (text: string, voiceId: string): Promise<string> => {
    // In a real application, this would fetch an audio stream from ElevenLabs
    // For demonstration, we'll create a placeholder audio blob
    console.log('Simulating ElevenLabs TTS for:', text);
    const audioBlob = new Blob([`This is synthesized speech for: "${text}"`], { type: 'audio/wav' });
    return URL.createObjectURL(audioBlob);
  };

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });

    // Restore microphone gain
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = 1;
    }

    activeRequestRef.current = null;
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: newVolume });
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  // Enhanced dynamic gain control based on AI state
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      
      // Mute microphone during AI responses to prevent feedback loops
      if (isAIResponding || state.isPlaying || state.isLoading) {
        gainNodeRef.current.gain.setValueAtTime(0, currentTime);
        console.log('🔇 Microphone muted - AI is responding/playing');
      } else {
        gainNodeRef.current.gain.setValueAtTime(1, currentTime);
        console.log('🎤 Microphone unmuted - Ready for user input');
      }
    }
  }, [isAIResponding, state.isPlaying, state.isLoading]);

  // Cleanup on unmount - NO dependencies to prevent loops
  useEffect(() => {
    return () => {
      console.log('🎤 Voice handler cleanup on unmount');
      try {
        // Clear all timeouts
        [autoSendTimeoutRef, debounceTimeoutRef, silenceDetectionRef].forEach(ref => {
          if (ref.current) {
            clearTimeout(ref.current);
            ref.current = null;
          }
        });

        // Stop main recognition
        if (recognitionRef.current) {
          try {
            if (recognitionRef.current.backgroundRecognition) {
              recognitionRef.current.backgroundRecognition.abort();
              recognitionRef.current.backgroundRecognition = null;
            }
            recognitionRef.current.abort();
            recognitionRef.current = null;
          } catch (error) {
            console.warn('🚨 Error aborting recognition:', error);
          }
        }

        // Clean up audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Clean up media stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Stop TTS audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current = null;
        }
      } catch (error) {
        console.error('🚨 Cleanup error on unmount:', error);
      }
    };
  }, []); // NO dependencies to prevent cleanup loops

  // Error recovery function
  const resetVoiceSystem = useCallback(() => {
    console.log('🔄 Resetting voice system...');
    setHasError(false);
    dispatch({ type: 'RESET' });
    cleanup();
  }, [cleanup]);

  // Get browser info for UI messaging
  const userAgent = navigator.userAgent.toLowerCase();
  const browserInfo = {
    isChrome: userAgent.includes('chrome') && !userAgent.includes('edge') && !userAgent.includes('opr'),
    isEdge: userAgent.includes('edge') || userAgent.includes('edg/'),
    isSafari: userAgent.includes('safari') && !userAgent.includes('chrome'),
    isFirefox: userAgent.includes('firefox'),
    isOpera: userAgent.includes('opr') || userAgent.includes('opera'),
    hasAPI: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    name: userAgent.includes('firefox') ? 'Firefox' :
          userAgent.includes('safari') && !userAgent.includes('chrome') ? 'Safari' :
          userAgent.includes('edge') || userAgent.includes('edg/') ? 'Microsoft Edge' :
          userAgent.includes('chrome') ? 'Chrome' : 
          userAgent.includes('opr') || userAgent.includes('opera') ? 'Opera' : 'Unknown Browser',
    fullUserAgent: navigator.userAgent
  };

  // Early return if in error state
  if (hasError) {
    console.warn('🚨 Voice handler in error state, returning safe defaults');
    return {
      isListening: false,
      currentTranscript: '',
      confidence: 0,
      voiceState: 'idle' as const,
      audioLevel: 0,
      startListening: async () => { 
        console.warn('Voice handler disabled due to error - attempting reset...');
        resetVoiceSystem();
        return false; 
      },
      stopListening: () => { 
        console.warn('Voice handler disabled due to error');
        resetVoiceSystem();
      },
      toggleListening: async () => { 
        console.warn('Voice handler disabled due to error - attempting reset...');
        resetVoiceSystem();
        return false; 
      },
      isSupported: false,
      hasPermission: false,
      interruptAI: () => { 
        console.warn('Voice handler disabled due to error');
        resetVoiceSystem();
      },
      playText: async () => { 
        console.warn('Voice handler disabled due to error');
        resetVoiceSystem();
      },
      stopPlayback: () => { 
        console.warn('Voice handler disabled due to error');
        resetVoiceSystem();
      },
      isPlaying: false,
      isLoading: false,
      volume: 0,
      setVolume: () => { 
        console.warn('Voice handler disabled due to error');
        resetVoiceSystem();
      },
      browserInfo
    };
  }

  return {
    isListening: state.isListening,
    currentTranscript: state.currentTranscript,
    confidence: state.confidence,
    voiceState: state.voiceState,
    audioLevel: state.audioLevel,
    startListening,
    stopListening,
    toggleListening,
    isSupported: state.isSupported,
    hasPermission: state.hasPermission,
    interruptAI,
    // ElevenLabs TTS methods
    playText,
    stopPlayback,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    volume: state.volume,
    setVolume,
    browserInfo
  };
}