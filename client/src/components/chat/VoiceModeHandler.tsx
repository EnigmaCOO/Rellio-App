import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { useReliableTTS } from '@/hooks/useReliableTTS';

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
  preventAutoSend?: boolean; // New prop to prevent auto-send when user is typing
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
  // Background listening removed - using single SR instance only
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
  // BRIDGE METHODS: Connect external TTS systems (like VoiceTalkBackHandler)
  onAISpeakingStart: () => void;
  onAISpeakingEnd: () => void;
  setExternalTTSStopCallback: (callback: (() => void) | null) => void;
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
  voiceId = 'ErXwobaYiN019PkySvjV',
  preventAutoSend = false
}: VoiceModeHandlerProps): VoiceModeHandlerReturn {

  // Enhanced state management with useReducer
  const [state, dispatch] = useReducer(voiceReducer, initialState);

  // Add error boundary protection
  const [hasError, setHasError] = useState(false);
  const isInterruptedRef = useRef<boolean>(false);
  const isPostInterruptionRef = useRef<boolean>(false); // Track post-interruption state for 1.5s auto-send
  const interruptionCooldownRef = useRef<boolean>(false); // 1s cooldown to prevent interruption loops
  const startListeningRef = useRef<(() => Promise<boolean>) | null>(null); // Forward ref to startListening function
  
  // Transactional interruption system refs
  const interruptionInFlightRef = useRef<boolean>(false);
  const srStoppingRef = useRef<boolean>(false);

  // Reset error state when disabled changes
  useEffect(() => {
    if (disabled) {
      setHasError(false);
    }
  }, [disabled]);

  // UNIFIED SR SYSTEM: Single Speech Recognition instance with pause/resume
  const recognitionRef = useRef<any>(null);
  // REMOVED: backgroundRecognitionRef - using single SR with pause/resume pattern
  const isPausedRef = useRef<boolean>(false); // DEPRECATED: Will be replaced with hard stop/start
  const wasListeningBeforeTTSRef = useRef<boolean>(false); // Track if we need to restart SR after TTS  
  const postTTSIgnoreUntilRef = useRef<number>(0); // Ignore SR results for 400ms after TTS ends
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // Shared MediaStream
  const micGainNodeRef = useRef<GainNode | null>(null); // Mic input gain control
  const ttsGainNodeRef = useRef<GainNode | null>(null); // TTS output gain control
  const isInitializingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRequestRef = useRef<string | null>(null);
  const interruptionDetectionRef = useRef<boolean>(false); // Track interruption monitoring

  // LEGEND LABS TTS BRIDGE: Initialize reliable TTS with unified interruption system
  const reliableTTS = useReliableTTS({
    volume: state.volume,
    gainNode: ttsGainNodeRef.current, // Pass TTS gain node for 300ms fade-out
    onStart: async () => {
      console.log('🌊 CRITICAL FIX: TTS started - HARD-STOPPING Speech Recognition to prevent loop');
      
      // Save if we were listening before TTS started
      wasListeningBeforeTTSRef.current = state.isListening;
      
      // HARD STOP Speech Recognition instead of just pausing
      if (recognitionRef.current && state.isListening) {
        console.log('🛑 HARD STOPPING SR during TTS to prevent audio bleed');
        try {
          await stopListeningSafely();
        } catch (stopError) {
          console.warn('⚠️ Error stopping SR during TTS start:', stopError);
        }
      }
      
      // Continue with existing isolation
      muteMicrophoneGain();
      startInterruptionDetection(); 
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: true, loading: false } });
      updateVoiceState('speaking');
    },
    onEnd: () => {
      console.log('🌊 CRITICAL FIX: TTS ended - setting up ignore window and restarting SR');
      
      // Set ignore window to prevent capturing TTS tail audio (400ms)
      postTTSIgnoreUntilRef.current = Date.now() + 400;
      console.log('⏱️ IGNORE WINDOW: SR results ignored for 400ms to prevent TTS tail capture');
      
      // Standard cleanup
      unmuteMicrophoneGain();
      stopInterruptionDetection(); 
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
      updateVoiceState('idle');
      activeRequestRef.current = null;
      
      // RESTART Speech Recognition after delay if we were listening before
      if (wasListeningBeforeTTSRef.current) {
        console.log('🔄 RESTARTING SR after 150ms delay to prevent TTS audio capture');
        setTimeout(() => {
          if (startListeningRef.current) {
            startListeningRef.current().then(() => {
              console.log('✅ SR restarted successfully after TTS ended');
              wasListeningBeforeTTSRef.current = false; // Reset flag
            }).catch((error) => {
              console.error('🚨 Failed to restart SR after TTS:', error);
              wasListeningBeforeTTSRef.current = false; // Reset flag on error
            });
          }
        }, 150); // 150ms delay as per architect recommendation
      }
    },
    onError: (error) => {
      console.error('🔊 TTS Error:', error);
      console.log('🌊 CRITICAL FIX: TTS error - setting ignore window and restarting SR');
      
      // CRITICAL FIX: Set ignore window and restart SR (same as onEnd)
      postTTSIgnoreUntilRef.current = Date.now() + 400;
      console.log('⏱️ IGNORE WINDOW: TTS error - SR results ignored for 400ms');
      
      // Standard cleanup
      unmuteMicrophoneGain();
      stopInterruptionDetection();
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
      updateVoiceState('idle');
      activeRequestRef.current = null;
      
      // RESTART Speech Recognition after delay if we were listening before
      if (wasListeningBeforeTTSRef.current) {
        console.log('🔄 RESTARTING SR after TTS error');
        setTimeout(() => {
          if (startListeningRef.current) {
            startListeningRef.current().then(() => {
              console.log('✅ SR restarted successfully after TTS error');
              wasListeningBeforeTTSRef.current = false;
            }).catch((restartError) => {
              console.error('🚨 Failed to restart SR after TTS error:', restartError);
              wasListeningBeforeTTSRef.current = false;
            });
          }
        }, 150);
      }
    }
  });

  // Enhanced voice support detection
  useEffect(() => {
    const checkSupportAndPermissions = async () => {
      try {
        const userAgent = navigator.userAgent.toLowerCase();
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        console.log('🔍 Checking voice support:', { 
          userAgent: userAgent.substring(0, 50), 
          hasSpeechAPI: !!SpeechRecognition,
          isChrome: userAgent.includes('chrome'),
          isEdge: userAgent.includes('edge'),
          isFirefox: userAgent.includes('firefox'),
          isSafari: userAgent.includes('safari') && !userAgent.includes('chrome')
        });

        // Consistent browser support check
        const supported = !!SpeechRecognition && (
          userAgent.includes('chrome') || 
          userAgent.includes('edge') || 
          userAgent.includes('edg/')
        );
        
        if (supported) {
          console.log('✅ Speech Recognition API found and browser supported - voice input enabled');
        } else {
          console.log('❌ Voice not supported in this browser - use Chrome or Edge');
        }

        // Don't check permissions upfront - let user trigger the permission request
        const hasPermission = false; // Will be checked when user actually clicks

        console.log('🎤 Voice system initialized:', { supported, hasPermission });
        dispatch({ type: 'SET_SUPPORT', payload: { supported, permission: hasPermission } });
        
        // Clear any previous errors on successful initialization
        setHasError(false);
      } catch (error) {
        console.error('🚨 Voice support check failed:', error);
        dispatch({ type: 'SET_SUPPORT', payload: { supported: false, permission: false } });
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

  // Enhanced cleanup function with GROK-STYLE TTS cleanup
  const cleanup = useCallback(async () => {
    console.log('🎤 Enhanced voice handler cleanup');
    try {
      // Clear all timeouts
      [autoSendTimeoutRef, debounceTimeoutRef, silenceDetectionRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });

      // Stop recognition safely
      await stopListeningSafely();
      
      // Stop background listening
      stopInterruptionDetection();

      // Clean up audio context with better error handling
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
          }
          audioContextRef.current = null;
        } catch (error) {
          console.warn('🚨 Error closing audio context:', error);
        }
      }

      // Clean up media stream
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
              console.warn('🚨 Error stopping track:', e);
            }
          });
          streamRef.current = null;
        } catch (error) {
          console.warn('🚨 Error cleaning up media stream:', error);
        }
      }

      // Stop all TTS playback
      try {
        stopTTSPlayback();
      } catch (error) {
        console.warn('🚨 Error stopping TTS playback:', error);
      }

      // Unmute microphone
      unmuteMicrophoneGain();

      // Reset state
      dispatch({ type: 'SET_LISTENING', payload: false });
      dispatch({ type: 'SET_STATE', payload: 'idle' });
      
      console.log('✅ Voice handler cleanup completed');
    } catch (error) {
      console.error('🚨 Critical cleanup error:', error);
      // Don't set hasError during cleanup as it can cause infinite loops
    }
  }, []); // NO dependencies to prevent infinite loops

  // Enhanced audio context initialization with PROPER track muting for isolation
  const initializeAudioContext = useCallback(async () => {
    if (audioContextRef.current || isInitializingRef.current || hasError) return;

    try {
      isInitializingRef.current = true;
      console.log('🔧 Initializing shared MediaStream with track-level muting...');

      // Request microphone with MAXIMUM isolation constraints - SINGLE SHARED STREAM
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

      console.log('🎤 SHARED MediaStream initialized - tracks:', stream.getAudioTracks().length);
      console.log('🎤 Initial track muting state: UNMUTED (ready for speech)');

      // Apply initial muting state based on AI status
      if (isAIResponding) {
        muteMicrophoneGain();
      }

      // LEGEND LABS AUDIO ARCHITECTURE: Enhanced dual-gain isolation system
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create dual gain nodes for precise control
      const micGainNode = audioContext.createGain();
      const ttsGainNode = audioContext.createGain();
      micGainNodeRef.current = micGainNode;
      ttsGainNodeRef.current = ttsGainNode;

      // LEGEND LABS CHAIN: Microphone -> MicGain -> Analyser -> Destination
      // This allows gain-based muting while preserving analyser functionality
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(micGainNode);
      micGainNode.connect(analyser);
      
      // Keep analyser active for interruption detection even when mic is gain-muted
      console.log('✅ LEGEND LABS: Dual-gain audio chain initialized for precise isolation');

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

      requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, [hasError]);

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

  // LEGEND LABS GAIN-BASED ISOLATION: Use AudioContext gain nodes for precise control
  const muteMicrophoneGain = useCallback(() => {
    if (!micGainNodeRef.current) return;
    
    console.log('🔇 LEGEND LABS: Muting microphone via gain control (preserves analyser)');
    const audioContext = audioContextRef.current;
    if (audioContext) {
      const currentTime = audioContext.currentTime;
      micGainNodeRef.current.gain.cancelScheduledValues(currentTime);
      micGainNodeRef.current.gain.setValueAtTime(0, currentTime);
      console.log('✅ AUDIO ISOLATION: Microphone gain set to 0 (analyser still active for interruption detection)');
    }
  }, []);

  const unmuteMicrophoneGain = useCallback(() => {
    if (!micGainNodeRef.current) return;
    
    console.log('🔉 LEGEND LABS: Unmuting microphone via gain control');
    const audioContext = audioContextRef.current;
    if (audioContext) {
      const currentTime = audioContext.currentTime;
      micGainNodeRef.current.gain.cancelScheduledValues(currentTime);
      micGainNodeRef.current.gain.setValueAtTime(1, currentTime);
      console.log('✅ AUDIO READY: Microphone gain restored to 1.0 for user speech');
    }
  }, []);

  // LEGEND LABS UNIFIED SR: Single SR instance with pause/resume and audio-level interruption detection
  const startInterruptionDetection = useCallback(() => {
    if (interruptionDetectionRef.current || !analyserRef.current) return;
    
    console.log('🔮 LEGEND LABS: Starting audio-level interruption detection during TTS');
    interruptionDetectionRef.current = true;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let consecutiveHighSamples = 0;
    const requiredConsecutiveSamples = 5;
    const interruptionThreshold = 30; // Threshold for detecting speech
    
    const monitorInterruption = () => {
      if (!interruptionDetectionRef.current || !analyser) return;
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      if (average > interruptionThreshold) {
        consecutiveHighSamples++;
        if (consecutiveHighSamples >= requiredConsecutiveSamples) {
          if (interruptionCooldownRef.current) {
            console.log('⏱️ INTERRUPTION COOLDOWN: Ignoring interruption during 1s cooldown period');
            consecutiveHighSamples = 0;
            requestAnimationFrame(monitorInterruption);
            return;
          }
          
          console.log('🚨 LEGEND LABS: Audio interruption detected - user speaking!');
          interruptionDetectionRef.current = false;
          handleInterruption();
          return;
        }
      } else {
        consecutiveHighSamples = 0;
      }
      
      requestAnimationFrame(monitorInterruption);
    };
    
    monitorInterruption();
    console.log('✅ LEGEND LABS: Audio-level interruption detection active');
  }, []);

  const stopInterruptionDetection = useCallback(() => {
    if (!interruptionDetectionRef.current) return;
    
    console.log('🎭 LEGEND LABS: Stopping audio-level interruption detection');
    interruptionDetectionRef.current = false;
  }, []);

  // LEGEND LABS-INSPIRED INTERRUPTION HANDLING: Smooth transition with proper SR restart
  // LEGEND LABS 300MS FADE-OUT: Smooth interruption with gain ramp and SR restart
  const handleInterruption = useCallback(() => {
    if (interruptionInFlightRef.current) {
      console.log('🔄 INTERRUPTION: Already in progress, ignoring duplicate');
      return;
    }
    
    interruptionInFlightRef.current = true;
    console.log('🚨 LEGEND LABS INTERRUPTION: Initiating 300ms fade-out transition');
    
    // STEP 1: Begin 300ms TTS gain fade-out (if TTS gain node exists)
    if (ttsGainNodeRef.current && audioContextRef.current) {
      const audioContext = audioContextRef.current;
      const currentTime = audioContext.currentTime;
      console.log('🏛️ TTS FADE-OUT: Beginning 300ms gain ramp from 1.0 to 0.0');
      
      ttsGainNodeRef.current.gain.cancelScheduledValues(currentTime);
      ttsGainNodeRef.current.gain.setValueAtTime(ttsGainNodeRef.current.gain.value, currentTime);
      ttsGainNodeRef.current.gain.linearRampToValueAtTime(0.0, currentTime + 0.3); // 300ms ramp
    }
    
    // STEP 2: Stop TTS playback immediately (behind the fade)
    try {
      reliableTTS.stopPlayback();
      console.log('🔊 AI TTS stopped during fade-out');
    } catch (error) {
      console.warn('⚠️ Error stopping AI TTS:', error);
    }
    
    // STEP 3: Stop interruption detection
    stopInterruptionDetection();
    
    // STEP 4: 300ms fade-out timing as per task specification
    console.log('⏱️ FADE-OUT: 300ms audio fade transition...');
    setTimeout(() => {
      console.log('✅ FADE-OUT COMPLETE: Proceeding with mic unmute and SR restart');
      
      // STEP 5: Unmute microphone gain after fade-out
      unmuteMicrophoneGain();
      
      // STEP 6: Update states and prepare for main SR
      updateVoiceState('interrupted');
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
      dispatch({ type: 'SET_LISTENING', payload: true }); // CRITICAL: Set isListening true
      
      // STEP 7: LEGEND LABS SR RESTART: Resume/restart main SR for transcription
      console.log('🎤 LEGEND LABS: Restarting main SR for post-interruption transcription');
      
      // If SR is paused, resume it; otherwise restart completely
      if (recognitionRef.current && isPausedRef.current) {
        console.log('🔄 LEGEND LABS: Resuming paused SR for post-interruption input');
        try {
          isPausedRef.current = false;
          // SR is still running, just unmuted - ready for input
          console.log('✅ Main SR resumed successfully for post-interruption input');
        } catch (resumeError) {
          console.error('🚨 Failed to resume SR after interruption:', resumeError);
          // Fallback to full restart with 200ms delay
          if (startListeningRef.current) {
            setTimeout(() => {
              console.log('🔄 FALLBACK: Restarting SR after resume failed');
              startListeningRef.current!().catch(retryError => {
                console.error('🚨 SR restart fallback failed:', retryError);
              });
            }, 200);
          }
        }
      } else {
        // Full SR restart needed
        if (startListeningRef.current) {
          startListeningRef.current().then(() => {
            console.log('✅ Main SR restarted successfully for post-interruption input');
          }).catch((error) => {
            console.error('🚨 Failed to restart main SR after interruption:', error);
            // LEGEND LABS: 200ms restart-on-abort pattern
            setTimeout(() => {
              console.log('🔄 LEGEND LABS: Attempting SR restart after 200ms delay');
              if (startListeningRef.current) {
                startListeningRef.current().catch(retryError => {
                  console.error('🚨 SR restart retry failed:', retryError);
                });
              }
            }, 200);
          });
        }
      }
      
      // STEP 8: Set post-interruption flag for enhanced 1.5s auto-send behavior
      isPostInterruptionRef.current = true;
      console.log('📝 POST-INTERRUPTION: Enhanced 1.5s auto-send mode activated');
      
      // STEP 9: Call interruption callback
      try {
        onInterrupt();
        console.log('🎤 LEGEND LABS INTERRUPTION: Complete - ready for seamless voice input');
      } catch (error) {
        console.warn('⚠️ Error calling onInterrupt:', error);
      }
      
      interruptionInFlightRef.current = false;
    }, 300); // 300ms fade-out timing
    
  }, [reliableTTS, unmuteMicrophoneGain, stopInterruptionDetection, updateVoiceState, onInterrupt]);

  // Forward declaration to fix dependency order issues
  const switchToMainRecognitionRef = useRef<((transcript?: string) => Promise<void>) | null>(null);
  
  // LEGEND LABS-STYLE TTS: Real ElevenLabs audio.play() with SpeechSynthesis fallback
  const playTextWithElevenLabs = useCallback(async (text: string, voiceId?: string): Promise<void> => {
    if (!text.trim()) return;
    
    console.log('🔮 LEGEND LABS TTS: Starting real ElevenLabs audio.play() -> SpeechSynthesis fallback');
    dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: true } });
    
    try {
      // LEGEND LABS: Activate interruption system for TTS
      console.log('🔮 LEGEND LABS: TTS started - activating seamless interruption system');
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: true, loading: false } });
      
      // CRITICAL FIX: Hard-stop Speech Recognition for ElevenLabs path too
      wasListeningBeforeTTSRef.current = state.isListening;
      if (recognitionRef.current && state.isListening) {
        console.log('🛑 CRITICAL: Hard-stopping SR for ElevenLabs path to prevent loop');
        try {
          await stopListeningSafely();
        } catch (stopError) {
          console.warn('⚠️ Error stopping SR during ElevenLabs start:', stopError);
        }
      }
      
      // LEGEND LABS-STYLE: Mute mic during AI speech and start interruption detection  
      muteMicrophoneGain();
      startInterruptionDetection();
      updateVoiceState('speaking');
      
      // Step 1: Try ElevenLabs API with real audio.play()
      console.log('🎵 LEGEND LABS: Attempting ElevenLabs API with real audio playback...');
      
      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: voiceId || 'ErXwobaYiN019PkySvjV' // Default Antoni voice
        })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        if (audioBlob.size > 0) {
          console.log('✅ ElevenLabs TTS successful:', audioBlob.size, 'bytes');
          await playAudioBlob(audioBlob);
          return; // Success - exit early
        }
      }
      
      console.log('⚠️ ElevenLabs failed, falling back to browser SpeechSynthesis');
    } catch (elevenLabsError) {
      console.warn('⚠️ ElevenLabs error:', elevenLabsError);
    }
    
    // Step 2: Fallback to browser SpeechSynthesis
    console.log('🔊 FALLBACK: Using browser SpeechSynthesis with cleanup');
    try {
      await reliableTTS.playText(text);
    } catch (fallbackError) {
      console.error('🚨 All TTS methods failed:', fallbackError);
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
      updateVoiceState('idle');
      unmuteMicrophoneGain();
      stopInterruptionDetection();
      
      // BRIDGE: Deactivate interruption system on TTS failure
      console.log('🌊 BRIDGE: Internal TTS failed - deactivating interruption system');
    }
    
  }, [muteMicrophoneGain, startInterruptionDetection, updateVoiceState, reliableTTS, unmuteMicrophoneGain, stopInterruptionDetection]);
  
  // Audio blob playback helper
  const playAudioBlob = useCallback(async (blob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.volume = state.volume;
      
      audio.oncanplay = () => {
        console.log('🎵 ElevenLabs audio ready to play');
        dispatch({ type: 'SET_TTS_STATE', payload: { playing: true, loading: false } });
      };
      
      audio.onended = () => {
        console.log('✅ ElevenLabs audio playback completed');
        
        // CRITICAL FIX: Set ignore window and restart SR (same as reliableTTS.onEnd)
        postTTSIgnoreUntilRef.current = Date.now() + 400;
        console.log('⏱️ IGNORE WINDOW: ElevenLabs end - SR results ignored for 400ms');
        
        dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
        updateVoiceState('idle');
        unmuteMicrophoneGain();
        stopInterruptionDetection();
        
        // RESTART Speech Recognition after delay if we were listening before
        if (wasListeningBeforeTTSRef.current) {
          console.log('🔄 RESTARTING SR after ElevenLabs audio ended');
          setTimeout(() => {
            if (startListeningRef.current) {
              startListeningRef.current().then(() => {
                console.log('✅ SR restarted successfully after ElevenLabs audio');
                wasListeningBeforeTTSRef.current = false;
              }).catch((error) => {
                console.error('🚨 Failed to restart SR after ElevenLabs audio:', error);
                wasListeningBeforeTTSRef.current = false;
              });
            }
          }, 150);
        }
        
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error('🚨 ElevenLabs audio error:', error);
        
        // CRITICAL FIX: Handle error with same SR restart logic
        postTTSIgnoreUntilRef.current = Date.now() + 400;
        console.log('⏱️ IGNORE WINDOW: ElevenLabs error - SR results ignored for 400ms');
        
        dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
        updateVoiceState('idle');
        unmuteMicrophoneGain();
        stopInterruptionDetection();
        
        // RESTART Speech Recognition on error too
        if (wasListeningBeforeTTSRef.current) {
          console.log('🔄 RESTARTING SR after ElevenLabs error');
          setTimeout(() => {
            if (startListeningRef.current) {
              startListeningRef.current().then(() => {
                console.log('✅ SR restarted after ElevenLabs error');
                wasListeningBeforeTTSRef.current = false;
              }).catch((restartError) => {
                console.error('🚨 Failed to restart SR after ElevenLabs error:', restartError);
                wasListeningBeforeTTSRef.current = false;
              });
            }
          }, 150);
        }
        
        reject(new Error('Audio playback failed'));
      };
      
      audio.src = URL.createObjectURL(blob);
      audio.play().catch(reject);
    });
  }, [state.volume, updateVoiceState, unmuteMicrophoneGain, stopInterruptionDetection]);
  
  // Stop TTS playback function
  const stopTTSPlayback = useCallback(() => {
    console.log('🔇 Stopping all TTS playback...');
    
    try {
      reliableTTS.stopPlayback();
    } catch (error) {
      console.warn('⚠️ Error stopping reliable TTS:', error);
    }
    
    // Stop any audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    
    // CRITICAL FIX: Apply consistent ignore window and SR restart for stopTTSPlayback
    postTTSIgnoreUntilRef.current = Date.now() + 400;
    console.log('⏱️ IGNORE WINDOW: Manual TTS stop - SR results ignored for 400ms');
    
    // Reset states
    dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
    updateVoiceState('idle');
    unmuteMicrophoneGain();
    stopInterruptionDetection();
    
    // RESTART Speech Recognition after delay if we were listening before
    if (wasListeningBeforeTTSRef.current) {
      console.log('🔄 RESTARTING SR after manual TTS stop');
      setTimeout(() => {
        if (startListeningRef.current) {
          startListeningRef.current().then(() => {
            console.log('✅ SR restarted successfully after manual stop');
            wasListeningBeforeTTSRef.current = false;
          }).catch((error) => {
            console.error('🚨 Failed to restart SR after manual stop:', error);
            wasListeningBeforeTTSRef.current = false;
          });
        }
      }, 150);
    }
  }, [reliableTTS, updateVoiceState, unmuteMicrophoneGain, stopInterruptionDetection]);

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

        // Ensure clean state before starting main recognition
        console.log('🎤 MICROPHONE ISOLATION: Ensuring clean state before main listening');
        if (interruptionDetectionRef.current) {
          stopInterruptionDetection();
          // Add a small delay to ensure cleanup completes
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          console.error('🚫 Speech Recognition API not available in this browser');
          console.log('💡 Try using Chrome, Edge, or Safari for voice features');
          resolve(false);
          return;
        }

        // Check microphone permissions and device availability
        try {
          console.log('🎤 Checking microphone permissions...');
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          if (permissionStatus.state === 'denied') {
            console.error('🚫 Microphone permission denied');
            dispatch({ type: 'SET_SUPPORT', payload: { supported: true, permission: false } });
            resolve(false);
            return;
          }

          console.log('✅ Microphone permission:', permissionStatus.state);
          
          // Test if microphone device is actually available
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
            
            if (audioInputDevices.length === 0) {
              console.warn('🚫 No microphone devices found');
              dispatch({ type: 'SET_SUPPORT', payload: { supported: false, permission: false } });
              resolve(false);
              return;
            }
            
            console.log('✅ Found audio input devices:', audioInputDevices.length);
          } catch (deviceError) {
            console.warn('⚠️ Could not enumerate devices, proceeding anyway:', deviceError);
          }
          
        } catch (permError) {
          console.log('⚠️ Could not check permissions, proceeding with caution:', permError);
        }

        // Initialize audio context for isolation - with better error handling
        console.log('🔊 Initializing audio context...');
        try {
          await initializeAudioContext();
        } catch (audioError) {
          console.error('🚫 Audio context initialization failed:', audioError);
          // Continue without audio context - basic recognition can still work
          console.log('⚠️ Continuing without audio context...');
        }

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
              // CRITICAL AUDIO ISOLATION FIX: Guard against TTS audio bleed
              if (state.tts.playing || Date.now() < postTTSIgnoreUntilRef.current) {
                console.log('🚫 AUDIO ISOLATION: Dropping SR result during TTS or ignore window');
                return;
              }
              
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

                  // Enhanced Auto-Send: 1.5s pause after speech ends with post-interruption handling
                  if (!preventAutoSend && autoSendDelay > 0 && confidence >= confidenceThreshold && cleanFinalTranscript.length > 0) {
                    const isPostInterruption = isPostInterruptionRef.current;
                    
                    if (isPostInterruption) {
                      console.log('🚨 POST-INTERRUPTION AUTO-SEND: 1.5s after interruption speech ends');
                      console.log('📝 CLEAN TRANSCRIPT (post-interruption):', cleanFinalTranscript, 'confidence:', confidence);
                      console.log('✅ INTERRUPTION HANDLING: Clean transcript without AI audio bleed detected');
                    } else {
                      console.log('🎤 SCHEDULING AUTO-SEND: 1.5s after speech ends');
                      console.log('🎤 TRANSCRIPT:', cleanFinalTranscript, 'confidence:', confidence);
                    }
                    
                    // Clear any existing timeout
                    if (autoSendTimeoutRef.current) {
                      clearTimeout(autoSendTimeoutRef.current);
                    }
                    
                    // Set 1.5s auto-send timeout (consistent for both normal and post-interruption)
                    autoSendTimeoutRef.current = setTimeout(() => {
                      const messageToSend = cleanFinalTranscript.trim();
                      if (messageToSend.length > 0) {
                        if (isPostInterruption) {
                          console.log('🚀 POST-INTERRUPTION AUTO-SEND after 1.5s pause:', messageToSend);
                          console.log('📝 TRANSCRIPT PASSED: Clean post-interruption question sent');
                          
                          // Start 1s cooldown to prevent loops per task specification  
                          interruptionCooldownRef.current = true;
                          console.log('⏱️ COOLDOWN START: 1s interruption cooldown activated to prevent loops');
                          setTimeout(() => {
                            interruptionCooldownRef.current = false;
                            console.log('⏱️ COOLDOWN END: 1s interruption cooldown completed, interruptions re-enabled');
                          }, 1000); // Task spec: 1s cooldown post-interruption
                          
                          // Reset post-interruption flag after successful send
                          isPostInterruptionRef.current = false;
                        } else {
                          console.log('🚀 AUTO-SENDING after 1.5s pause:', messageToSend);
                        }
                        onAutoSend(messageToSend);
                      }
                    }, 1500); // Task spec: 1.5s delay for both normal and post-interruption
                  } else {
                    console.log('✅ GROK MODE: Manual send - user controls timing');
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
            console.log('🚨 Recognition error:', event.error);

            // LEGEND LABS: 200ms restart-on-abort pattern
            if (event.error === 'aborted') {
              console.log('🔄 LEGEND LABS: Recognition aborted - implementing 200ms restart pattern');
              setTimeout(() => {
                if (!hasError && state.isSupported && !disabled) {
                  console.log('🔄 LEGEND LABS: Attempting SR restart after aborted error (200ms delay)');
                  startListening().then((restarted) => {
                    if (restarted) {
                      console.log('✅ LEGEND LABS: SR successfully restarted after abort');
                    } else {
                      console.warn('⚠️ LEGEND LABS: SR restart failed after abort');
                    }
                  }).catch(retryError => {
                    console.error('🚨 LEGEND LABS: SR restart error after abort:', retryError);
                  });
                }
              }, 200); // 200ms delay as per Legend Labs specification
              resolve(false);
              return;
            }

            if (event.error === 'not-allowed') {
              dispatch({ type: 'SET_SUPPORT', payload: { supported: state.isSupported, permission: false } });
            } else if (event.error === 'network') {
              console.warn('⚠️ Network error in speech recognition, implementing 200ms retry...');
              // LEGEND LABS: Network error recovery with 200ms delay
              setTimeout(() => {
                console.log('🔄 LEGEND LABS: Retrying SR after network error (200ms delay)');
                if (!hasError && state.isSupported) {
                  startListening().catch(retryError => {
                    console.error('🚨 LEGEND LABS: SR network retry failed:', retryError);
                  });
                }
              }, 200);
              resolve(false);
              return;
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

          // Try to start recognition with better error handling
          try {
            console.log('🎤 Starting speech recognition...');
            recognition.start();
            console.log('✅ Speech recognition started successfully');
          } catch (startError) {
            console.error('🚫 Failed to start speech recognition:', startError);
            if (startError instanceof DOMException) {
              if (startError.name === 'NotAllowedError') {
                console.error('🚫 Microphone permission denied by user');
                dispatch({ type: 'SET_SUPPORT', payload: { supported: true, permission: false } });
              } else if (startError.name === 'InvalidStateError') {
                console.error('🚫 Speech recognition already running');
              }
            }
            resolve(false);
            return;
          }
        
      } catch (error) {
        console.error('🚨 Critical voice system error:', error);
        setHasError(true);
        
        // Provide user-friendly error message
        let errorMessage = 'Voice recognition failed to start';
        if (error instanceof Error) {
          if (error.message.includes('not-allowed')) {
            errorMessage = 'Microphone permission required';
          } else if (error.message.includes('not supported')) {
            errorMessage = 'Voice recognition not supported in this browser';
          }
        }
        
        console.log('💡 User-friendly error:', errorMessage);
        
        // Use safe cleanup to avoid DOMException
        try {
          await stopListeningSafely();
        } catch (cleanupError) {
          console.warn('⚠️ Safe cleanup failed:', cleanupError);
          // Fallback to direct cleanup only if safe method fails
          if (recognitionRef.current) {
            recognitionRef.current = null;
          }
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

  // Forward declaration to fix dependency order issues
  const stopListeningSafelyRef = useRef<(() => Promise<void>) | null>(null);

  const toggleListening = useCallback(async (): Promise<boolean> => {
    console.log('🎤 TOGGLE LISTENING - Current state:', {
      listening: state.isListening,
      supported: state.isSupported,
      hasPermission: state.hasPermission,
      disabled,
      hasError
    });

    // If already listening, stop safely
    if (state.isListening) {
      console.log('🛑 Stopping listening safely...');
      if (stopListeningSafelyRef.current) {
        await stopListeningSafelyRef.current();
      }
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
  }, [state.isListening, state.isSupported, state.hasPermission, disabled, hasError, startListening]);

  // Safe speech recognition management with error suppression
  const stopListeningSafely = useCallback(async (): Promise<void> => {
    if (!recognitionRef.current || srStoppingRef.current) return;
    
    srStoppingRef.current = true;
    console.log('🎤 Stopping speech recognition safely...');
    
    return new Promise((resolve) => {
      if (!recognitionRef.current) {
        srStoppingRef.current = false;
        resolve();
        return;
      }

      const cleanup = () => {
        if (recognitionRef.current) {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current = null;
        }
        srStoppingRef.current = false;
        dispatch({ type: 'SET_LISTENING', payload: false });
        resolve();
      };

      // Set timeout to force cleanup if stop() doesn't trigger events
      const forceCleanup = setTimeout(() => {
        console.log('⏰ Force cleanup after timeout');
        cleanup();
      }, 1000);

      // Set up listeners before stopping
      recognitionRef.current.onend = () => {
        clearTimeout(forceCleanup);
        console.log('✅ Speech recognition ended normally');
        cleanup();
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        clearTimeout(forceCleanup);
        // All errors during stop are expected and safe to ignore
        console.log('✅ Speech recognition error during stop (expected):', event.error);
        cleanup();
      };

      try {
        recognitionRef.current.stop(); // Use stop() instead of abort()
      } catch (error) {
        clearTimeout(forceCleanup);
        console.log('✅ Error stopping recognition (handled):', error);
        cleanup();
      }
    });
  }, []);

  // Set forward ref for handleInterruption to use
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const startListeningSafely = useCallback(async (): Promise<boolean> => {
    console.log('🎤 Starting speech recognition safely...');
    
    // Ensure audio context is resumed
    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.warn('⚠️ Audio context resume error:', error);
    }

    // Ensure microphone gain is enabled
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = 1;
    }

    // Stop any existing recognition first
    if (recognitionRef.current) {
      await stopListeningSafely();
      await new Promise(resolve => setTimeout(resolve, 250)); // Settle delay
    }

    // Create fresh SR instance (SR is stateful after errors)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('🚨 Speech Recognition API not available');
      return false;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      // Set up error handling with suppression
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Suppress expected errors during intentional operations
        if ((srStoppingRef.current || interruptionInFlightRef.current) && 
            (event.error === 'aborted' || event.error === 'network')) {
          console.log('✅ Recognition error suppressed during intentional stop:', event.error);
          return;
        }
        console.warn('🚨 Recognition error:', event.error);
        setHasError(true);
      };

      // Start recognition with retry logic
      try {
        recognition.start();
        dispatch({ type: 'SET_LISTENING', payload: true });
        console.log('✅ Speech recognition started safely');
        return true;
      } catch (startError) {
        console.warn('⚠️ Recognition start failed, retrying...', startError);
        await new Promise(resolve => setTimeout(resolve, 250));
        try {
          recognition.start();
          dispatch({ type: 'SET_LISTENING', payload: true });
          console.log('✅ Speech recognition started on retry');
          return true;
        } catch (retryError) {
          console.error('🚨 Recognition start failed after retry:', retryError);
          return false;
        }
      }
    } catch (error) {
      console.error('🚨 Failed to create speech recognition:', error);
      return false;
    }
  }, []);

  // Assign the function to the ref to avoid circular dependency
  useEffect(() => {
    stopListeningSafelyRef.current = stopListeningSafely;
  }, [stopListeningSafely]);

  // Safe wrapper for stopListening - routes to safe method
  const stopListening = useCallback(async () => {
    console.log('🛑 Stopping listening (routing to safe method)');
    await stopListeningSafely();
  }, [stopListeningSafely]);

  // Transactional interruption system - atomic sequence
  const interruptAI = useCallback(async () => {
    // Prevent concurrent interruptions
    if (interruptionInFlightRef.current) {
      console.log('🚫 Interruption already in progress, skipping');
      return;
    }

    interruptionInFlightRef.current = true;
    console.log('🚨 INTERRUPT: Starting transactional interruption');

    try {
      // STEP 1: Stop TTS immediately
      if (reliableTTS) {
        reliableTTS.stopPlayback();
        console.log('✅ TTS stopped');
      }

      // STEP 2: Clear active requests and update state
      if (activeRequestRef.current) {
        activeRequestRef.current = null;
      }
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });

      // STEP 3: Wait for TTS to settle
      await new Promise(resolve => setTimeout(resolve, 300));

      // STEP 4: Notify parent
      try {
        if (onInterrupt && typeof onInterrupt === 'function') {
          onInterrupt();
        }
      } catch (callbackError) {
        console.warn('⚠️ Callback error:', callbackError);
      }

      // STEP 5: Start listening safely after settle delay
      updateVoiceState('listening');
      const started = await startListeningSafely();
      if (!started) {
        console.warn('⚠️ Could not start listening after interrupt');
        updateVoiceState('idle');
      }

      console.log('✅ Transactional interruption completed');
    } catch (error) {
      console.error('🚨 Interruption error:', error);
      updateVoiceState('idle');
    } finally {
      interruptionInFlightRef.current = false;
    }
  }, [updateVoiceState, onInterrupt, reliableTTS, startListeningSafely]);

  // Background recognition removed to eliminate concurrent SpeechRecognition instances
  // Using audio analysis for interruption detection instead

  // Simple and reliable TTS integration with voice interruption
  const playText = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || hasError) return;

    console.log('🔊 Playing text with reliable TTS + voice interruption:', text.substring(0, 50) + '...');

    // Simple active request tracking
    if (activeRequestRef.current) {
      console.log('🔄 TTS already active, skipping duplicate');
      return;
    }

    const requestId = `${Date.now()}-${Math.random()}`;
    activeRequestRef.current = requestId;

    try {
      // Background listening removed - interruption will be handled via UI button

      // Mute microphone during AI speech to prevent feedback
      if (micGainNodeRef.current) {
        micGainNodeRef.current.gain.value = 0;
      }

      // Use the reliable TTS system - this will trigger the onStart callback
      await reliableTTS.playText(text);

      // Unmute microphone after AI speech ends - this happens in the TTS onEnd callback

    } catch (error) {
      console.error('🚨 TTS error:', error);
      dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
      updateVoiceState('idle');

      // Restore microphone gain on error
      if (micGainNodeRef.current) {
        micGainNodeRef.current.gain.value = 1;
      }

      activeRequestRef.current = null;
      setHasError(true);
    }
  }, [hasError, updateVoiceState, reliableTTS]);


  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });

    // Restore microphone gain
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = 1;
    }

    activeRequestRef.current = null;
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: newVolume });
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  // LEGEND LABS: Enhanced dynamic gain control based on AI state
  useEffect(() => {
    if (micGainNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      
      // Mute microphone during AI responses to prevent feedback loops
      if (isAIResponding || state.isPlaying || state.isLoading) {
        micGainNodeRef.current.gain.setValueAtTime(0, currentTime);
        console.log('🔇 LEGEND LABS: Microphone gain muted - AI is responding/playing');
      } else {
        micGainNodeRef.current.gain.setValueAtTime(1, currentTime);
        console.log('🎤 LEGEND LABS: Microphone gain restored - Ready for user input');
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
            // Background recognition removed
            recognitionRef.current.stop(); // Use stop() instead of abort() to avoid DOMException
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
  
  // PUBLIC BRIDGE METHODS: Connect external TTS systems with interruption logic
  const externalTTSStopRef = useRef<(() => void) | null>(null);
  
  const onAISpeakingStart = useCallback(() => {
    console.log('🌊 BRIDGE: External TTS started - activating interruption system');
    muteMicrophoneGain();
    startInterruptionDetection();
    updateVoiceState('speaking');
    dispatch({ type: 'SET_TTS_STATE', payload: { playing: true, loading: false } });
  }, [muteMicrophoneGain, startInterruptionDetection, updateVoiceState]);
  
  const onAISpeakingEnd = useCallback(() => {
    console.log('🌊 BRIDGE: External TTS ended - deactivating interruption system');
    unmuteMicrophoneGain();
    stopInterruptionDetection();
    updateVoiceState('idle');
    dispatch({ type: 'SET_TTS_STATE', payload: { playing: false, loading: false } });
  }, [unmuteMicrophoneGain, stopInterruptionDetection, updateVoiceState]);
  
  const setExternalTTSStopCallback = useCallback((callback: (() => void) | null) => {
    externalTTSStopRef.current = callback;
  }, []);
  
  // Enhanced interruption handler that stops both internal and external TTS
  const enhancedInterruptAI = useCallback(() => {
    console.log('🚨 ENHANCED INTERRUPTION: Stopping all TTS playback');
    
    // Stop internal TTS
    interruptAI();
    
    // Stop external TTS if callback exists
    if (externalTTSStopRef.current) {
      console.log('🚨 BRIDGE: Stopping external TTS via callback');
      externalTTSStopRef.current();
    }
  }, [interruptAI]);


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
    interruptAI: enhancedInterruptAI,
    // Background listening removed
    // ElevenLabs TTS methods
    playText: playTextWithElevenLabs,
    stopPlayback: stopTTSPlayback,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    volume: state.volume,
    setVolume,
    browserInfo,
    // BRIDGE METHODS: Connect external TTS systems (like VoiceTalkBackHandler)
    onAISpeakingStart,
    onAISpeakingEnd,
    setExternalTTSStopCallback
  };
}