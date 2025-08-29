import { useReducer, useEffect, useRef, useCallback } from 'react';

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

  // Check support and permissions on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SpeechRecognition;
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => dispatch({ type: 'SET_SUPPORT', payload: { supported, permission: true } }))
        .catch(() => dispatch({ type: 'SET_SUPPORT', payload: { supported, permission: false } }));
    } else {
      dispatch({ type: 'SET_SUPPORT', payload: { supported, permission: false } });
    }
  }, []);

  const updateVoiceState = useCallback((newState: VoiceState) => {
    console.log('🎤 State change:', state.voiceState, '->', newState);
    dispatch({ type: 'SET_STATE', payload: newState });
    onStateChange(newState);
  }, [state.voiceState, onStateChange]);

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

    dispatch({ type: 'SET_LISTENING', payload: false });
    updateVoiceState('idle');
  }, [updateVoiceState]);

  // Enhanced audio context initialization with maximum echo cancellation
  const initializeAudioContext = useCallback(async () => {
    if (audioContextRef.current || isInitializingRef.current) return;
    
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
    } finally {
      isInitializingRef.current = false;
    }
  }, [isAIResponding]);

  // Enhanced audio level monitoring with interruption detection
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      if (!analyser) return;

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
  }, [state.voiceState, isAIResponding]);

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

  // Simplified auto-play control - only block during active listening
  const canAutoPlay = useCallback((): boolean => {
    // Only block if actively listening (not during processing or idle)
    if (state.isListening && state.voiceState === 'listening') {
      console.log('🎤 Auto-play blocked: Currently listening');
      return false;
    }
    
    console.log('✅ Auto-play allowed - Voice state:', state.voiceState);
    return true;
  }, [state.isListening, state.voiceState]);

  // Debounced startListening with 300ms debounce
  const startListening = useCallback(async (): Promise<boolean> => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    return new Promise((resolve) => {
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('🎤 Starting listening with 300ms debounce...');
          console.log('🔍 Voice support check:', { 
            isSupported: state.isSupported, 
            hasPermission: state.hasPermission, 
            disabled, 
            isListening: state.isListening 
          });
          
          if (!state.isSupported) {
            console.error('🚫 Speech recognition not supported');
            resolve(false);
            return;
          }

          if (!state.hasPermission) {
            console.error('🚫 Microphone permission not granted');
            resolve(false);
            return;
          }

          if (disabled || state.isListening) {
            console.log('🚫 Voice input disabled or already listening');
            resolve(false);
            return;
          }

          // Initialize audio context for isolation
          await initializeAudioContext();

          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;

          // Enhanced configuration
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.maxAlternatives = 3;

          let finalTranscript = '';
          let isProcessingFinal = false;

          recognition.onstart = () => {
            console.log('✅ Recognition started');
            dispatch({ type: 'SET_LISTENING', payload: true });
            updateVoiceState('listening');
          };

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              const transcript = result[0].transcript;
              const confidence = result[0].confidence;

              if (result.isFinal) {
                finalTranscript += transcript;
                dispatch({ 
                  type: 'SET_TRANSCRIPT', 
                  payload: { text: finalTranscript.trim(), confidence } 
                });
                onTranscript(finalTranscript.trim(), false);

                // Clear auto-send timeout if exists
                if (autoSendTimeoutRef.current) {
                  clearTimeout(autoSendTimeoutRef.current);
                }

                // Enhanced auto-send with duplicate prevention
                if (!isProcessingFinal && finalTranscript.trim() && confidence > confidenceThreshold) {
                  isProcessingFinal = true;
                  
                  if (!isDuplicateRequest(finalTranscript.trim())) {
                    autoSendTimeoutRef.current = setTimeout(() => {
                      console.log('🚀 Auto-sending with enhanced controls:', finalTranscript.trim());
                      dispatch({ type: 'UPDATE_REQUEST_TIME', payload: Date.now() });
                      onAutoSend(finalTranscript.trim());
                      updateVoiceState('processing');
                    }, autoSendDelay);
                  }
                }
              } else {
                interimTranscript += transcript;
                dispatch({ 
                  type: 'SET_TRANSCRIPT', 
                  payload: { text: interimTranscript, confidence } 
                });
                onTranscript(interimTranscript, true);
              }
            }
          };

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('🚨 Recognition error:', event.error);
            
            if (event.error === 'not-allowed') {
              dispatch({ type: 'SET_SUPPORT', payload: { supported: state.isSupported, permission: false } });
            }
            
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
          resolve(true);
        } catch (error) {
          console.error('🚨 Failed to start recognition:', error);
          cleanup();
          resolve(false);
        }
      }, 300); // 300ms debounce as specified
    });
  }, [
    state.isSupported, 
    state.hasPermission, 
    disabled, 
    state.isListening, 
    initializeAudioContext, 
    updateVoiceState, 
    onTranscript, 
    confidenceThreshold, 
    isDuplicateRequest, 
    onAutoSend, 
    autoSendDelay, 
    cleanup
  ]);

  const stopListening = useCallback(() => {
    console.log('🛑 Stopping listening');
    cleanup();
  }, [cleanup]);

  const toggleListening = useCallback(async (): Promise<boolean> => {
    console.log('🎤 Toggle voice input clicked - current state:', state.voiceState, 'listening:', state.isListening);
    console.log('🎤 Voice support:', { isSupported: state.isSupported, hasPermission: state.hasPermission });
    
    // Force stop any current activity first
    if (state.isListening) {
      console.log('🛑 Stopping current listening session');
      stopListening();
      return false;
    } 
    
    // Start listening
    console.log('🎤 Starting new listening session');
    const result = await startListening();
    console.log('🎤 Start listening result:', result);
    return result;
  }, [state.voiceState, state.isSupported, state.hasPermission, state.isListening, stopListening, startListening]);

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

  // Enhanced ElevenLabs TTS integration
  const playText = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    
    try {
      console.log('🔊 Playing text with ElevenLabs:', text.substring(0, 50) + '...');
      
      // Check auto-play permissions
      if (!canAutoPlay()) {
        console.log('🚫 Auto-play blocked by enhanced controls');
        return;
      }
      
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: true } });
      updateVoiceState('speaking');
      
      // Simple active request tracking
      if (activeRequestRef.current) {
        console.log('🔄 TTS already active, skipping duplicate');
        return;
      }
      
      const requestId = `${Date.now()}-${Math.random()}`;
      activeRequestRef.current = requestId;

      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice_id: voiceId,
          options: {
            stability: 0.3,
            similarity_boost: 0.9,
            style: 0.4,
            use_speaker_boost: true,
            optimize_streaming_latency: 3
          }
        })
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
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
        
        URL.revokeObjectURL(audioUrl);
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
        
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        activeRequestRef.current = null;
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
    }
  }, [state.volume, voiceId, canAutoPlay, updateVoiceState]);

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

  // Dynamic gain control based on AI state
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = (isAIResponding || state.isPlaying) ? 0 : 1;
    }
  }, [isAIResponding, state.isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

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
    setVolume
  };
}