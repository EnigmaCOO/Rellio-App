import React, { useReducer, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ScholarPersona } from './ScholarPersonas';

// Voice State Machine Types
export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

interface VoiceStateContext {
  state: VoiceState;
  transcript: string;
  confidence: number;
  audioLevel: number;
  isInterrupted: boolean;
  error: string | null;
  isSupported: boolean;
  hasPermission: boolean;
}

type VoiceAction =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'SET_TRANSCRIPT'; transcript: string; confidence: number }
  | { type: 'START_PROCESSING' }
  | { type: 'START_SPEAKING' }
  | { type: 'INTERRUPT' }
  | { type: 'SET_AUDIO_LEVEL'; level: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_SUPPORT'; isSupported: boolean; hasPermission: boolean }
  | { type: 'RESET' };

// ElevenLabs Voice Mapping
const DEFAULT_VOICES = {
  grok: 'ErXwobaYiN019PkySvjV', // Antoni - friendly, engaging
  mystic: 'EXAVITQu4vr4xnSDxMaL', // Bella - warm, calming female
  scholar: 'pNInz6obpgDQGcFmaJgB', // Adam - clear, professional male
  sage: 'VR6AewLTigWG4xSOukaG', // Arnold - deep, authoritative male
  guide: 'ErXwobaYiN019PkySvjV', // Antoni - friendly, engaging
  default: 'ErXwobaYiN019PkySvjV'
};

// Voice State Reducer
function voiceReducer(state: VoiceStateContext, action: VoiceAction): VoiceStateContext {
  switch (action.type) {
    case 'START_LISTENING':
      return {
        ...state,
        state: 'LISTENING',
        transcript: '',
        confidence: 0,
        isInterrupted: false,
        error: null
      };
      
    case 'STOP_LISTENING':
      return {
        ...state,
        state: 'IDLE',
        audioLevel: 0
      };
      
    case 'SET_TRANSCRIPT':
      return {
        ...state,
        transcript: action.transcript,
        confidence: action.confidence
      };
      
    case 'START_PROCESSING':
      return {
        ...state,
        state: 'PROCESSING'
      };
      
    case 'START_SPEAKING':
      return {
        ...state,
        state: 'SPEAKING',
        isInterrupted: false
      };
      
    case 'INTERRUPT':
      return {
        ...state,
        state: 'LISTENING',
        isInterrupted: true,
        transcript: ''
      };
      
    case 'SET_AUDIO_LEVEL':
      return {
        ...state,
        audioLevel: action.level
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        state: 'IDLE'
      };
      
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
      
    case 'SET_SUPPORT':
      return {
        ...state,
        isSupported: action.isSupported,
        hasPermission: action.hasPermission
      };
      
    case 'RESET':
      return {
        ...state,
        state: 'IDLE',
        transcript: '',
        confidence: 0,
        audioLevel: 0,
        isInterrupted: false,
        error: null
      };
      
    default:
      return state;
  }
}

// Initial state
const initialState: VoiceStateContext = {
  state: 'IDLE',
  transcript: '',
  confidence: 0,
  audioLevel: 0,
  isInterrupted: false,
  error: null,
  isSupported: false,
  hasPermission: false
};

export interface UnifiedVoiceHandlerProps {
  onTranscript: (text: string, isInterim: boolean) => void;
  onAutoSend: (text: string) => void;
  onInterrupt: () => void;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  selectedPersona?: ScholarPersona | null;
  disabled?: boolean;
  autoSendDelay?: number;
  confidenceThreshold?: number;
  interruptionSensitivity?: number;
  volume?: number;
}

export interface UnifiedVoiceHandlerReturn {
  voiceState: VoiceStateContext;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  toggleListening: () => Promise<boolean>;
  playText: (text: string) => Promise<void>;
  stopPlayback: () => void;
  interruptAI: () => void;
  setVolume: (volume: number) => void;
}

export function useUnifiedVoiceHandler({
  onTranscript,
  onAutoSend,
  onInterrupt,
  onPlaybackStart,
  onPlaybackEnd,
  selectedPersona,
  disabled = false,
  autoSendDelay = 1500,
  confidenceThreshold = 0.85,
  interruptionSensitivity = 0.3,
  volume = 0.8
}: UnifiedVoiceHandlerProps): UnifiedVoiceHandlerReturn {
  const { toast } = useToast();
  const [voiceState, dispatch] = useReducer(voiceReducer, initialState);
  
  // Refs for voice handling
  const recognitionRef = useRef<any>(null);
  const backgroundRecognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const interruptionCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);
  
  // Check browser support and permissions
  useEffect(() => {
    const checkSupport = async () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const isSupported = !!SpeechRecognition;
      
      let hasPermission = false;
      if (isSupported) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          hasPermission = true;
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          console.warn('🎤 Microphone permission denied:', error);
        }
      }
      
      dispatch({ type: 'SET_SUPPORT', isSupported, hasPermission });
    };
    
    checkSupport();
  }, []);
  
  // Initialize audio context for voice isolation
  const initializeAudioContext = useCallback(async () => {
    if (audioContextRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Get microphone stream with enhanced echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      // Create audio processing chain for isolation
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      gainNodeRef.current = audioContextRef.current.createGain();
      const destination = audioContextRef.current.createMediaStreamDestination();
      
      // Connect audio chain: source -> gain -> analyser -> destination
      source.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(destination);
      
      // Configure analyser for audio level monitoring
      analyserRef.current.fftSize = 256;
      
      console.log('✅ Audio context initialized with voice isolation');
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to access microphone' });
    }
  }, []);
  
  // Audio level monitoring
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || voiceState.state === 'SPEAKING') return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = average / 255;
    
    dispatch({ type: 'SET_AUDIO_LEVEL', level: normalizedLevel });
    
    if (voiceState.state === 'LISTENING') {
      requestAnimationFrame(updateAudioLevel);
    }
  }, [voiceState.state]);
  
  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    
    const recognition = new SpeechRecognition() as any;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      updateAudioLevel();
    };
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          dispatch({ type: 'SET_TRANSCRIPT', transcript: finalTranscript, confidence });
          onTranscript(finalTranscript, false);
          
          // Auto-send logic with debounced timeout
          if (confidence >= confidenceThreshold && finalTranscript.trim().length > 0) {
            if (autoSendTimeoutRef.current) {
              clearTimeout(autoSendTimeoutRef.current);
            }
            
            autoSendTimeoutRef.current = setTimeout(() => {
              console.log('🚀 Auto-sending transcript:', finalTranscript);
              dispatch({ type: 'START_PROCESSING' });
              onAutoSend(finalTranscript.trim());
            }, autoSendDelay);
          }
        } else {
          interimTranscript += transcript;
          dispatch({ type: 'SET_TRANSCRIPT', transcript: interimTranscript, confidence });
          onTranscript(interimTranscript, true);
        }
      }
      
      lastSpeechTimeRef.current = Date.now();
    };
    
    recognition.onspeechend = () => {
      console.log('🎤 Speech ended');
    };
    
    recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        dispatch({ type: 'SET_ERROR', error: `Speech recognition error: ${event.error}` });
      }
    };
    
    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      if (voiceState.state === 'LISTENING' && !disabled) {
        // Auto-restart if we're still supposed to be listening
        setTimeout(() => {
          if (recognitionRef.current && voiceState.state === 'LISTENING') {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.warn('🎤 Recognition restart failed:', error);
            }
          }
        }, 100);
      }
    };
    
    return recognition;
  }, [voiceState.state, disabled, confidenceThreshold, autoSendDelay, onTranscript, onAutoSend]);
  
  // Background recognition for interruption detection during AI speech
  const initializeBackgroundRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    
    const bgRecognition = new SpeechRecognition() as any;
    bgRecognition.continuous = true;
    bgRecognition.interimResults = false;
    bgRecognition.lang = 'en-US';
    
    bgRecognition.onspeechstart = () => {
      // Detect user speech during AI playback for interruption
      if (voiceState.state === 'SPEAKING' && voiceState.audioLevel > interruptionSensitivity) {
        console.log('🚨 User interruption detected during AI speech');
        interruptAI();
      }
    };
    
    bgRecognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.warn('🎤 Background recognition error:', event.error);
      }
    };
    
    return bgRecognition;
  }, [voiceState.state, voiceState.audioLevel, interruptionSensitivity]);
  
  // Start listening
  const startListening = useCallback(async (): Promise<boolean> => {
    if (!voiceState.isSupported || !voiceState.hasPermission || disabled || isInitializingRef.current) {
      return false;
    }
    
    try {
      isInitializingRef.current = true;
      
      await initializeAudioContext();
      
      recognitionRef.current = initializeRecognition();
      if (!recognitionRef.current) return false;
      
      dispatch({ type: 'START_LISTENING' });
      recognitionRef.current.start();
      
      console.log('✅ Voice listening started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to start voice recognition' });
      return false;
    } finally {
      isInitializingRef.current = false;
    }
  }, [voiceState.isSupported, voiceState.hasPermission, disabled, initializeAudioContext, initializeRecognition]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (error) {
        console.warn('🎤 Stop recognition error:', error);
      }
    }
    
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
    
    dispatch({ type: 'STOP_LISTENING' });
    console.log('🔇 Voice listening stopped');
  }, []);
  
  // Toggle listening
  const toggleListening = useCallback(async (): Promise<boolean> => {
    if (voiceState.state === 'LISTENING') {
      stopListening();
      return false;
    } else {
      return await startListening();
    }
  }, [voiceState.state, startListening, stopListening]);
  
  // Play text with ElevenLabs
  const playText = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    
    try {
      dispatch({ type: 'START_SPEAKING' });
      onPlaybackStart?.();
      
      // Mute microphone during AI speech
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current?.currentTime || 0);
        console.log('🔇 Microphone muted during AI speech');
      }
      
      // Stop main recognition, start background recognition for interruption
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      backgroundRecognitionRef.current = initializeBackgroundRecognition();
      if (backgroundRecognitionRef.current) {
        backgroundRecognitionRef.current.start();
      }
      
      // Get voice ID for current persona
      const voiceId = selectedPersona?.elevenLabsVoice || DEFAULT_VOICES.default;
      
      // Call ElevenLabs API
      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId,
          settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });
      
      if (!response.ok) throw new Error('ElevenLabs API error');
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = volume;
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        console.log('🔊 AI speech finished');
        onPlaybackEnd?.();
        
        // Restore microphone
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current?.currentTime || 0);
          console.log('🔊 Microphone restored after AI speech');
        }
        
        // Stop background recognition
        if (backgroundRecognitionRef.current) {
          backgroundRecognitionRef.current.stop();
          backgroundRecognitionRef.current = null;
        }
        
        dispatch({ type: 'RESET' });
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        console.error('🚨 Audio playback error');
        dispatch({ type: 'SET_ERROR', error: 'Audio playback failed' });
        onPlaybackEnd?.();
      };
      
      await audio.play();
      console.log('🔊 AI speech started with', voiceId);
      
    } catch (error) {
      console.error('🚨 Failed to play text:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to play audio' });
      onPlaybackEnd?.();
      
      // Restore microphone on error
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current?.currentTime || 0);
      }
    }
  }, [volume, selectedPersona, onPlaybackStart, onPlaybackEnd, initializeBackgroundRecognition]);
  
  // Stop playback
  const stopPlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // Stop background recognition
    if (backgroundRecognitionRef.current) {
      backgroundRecognitionRef.current.stop();
      backgroundRecognitionRef.current = null;
    }
    
    // Restore microphone
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current?.currentTime || 0);
    }
    
    dispatch({ type: 'RESET' });
    onPlaybackEnd?.();
    console.log('🛑 AI speech stopped');
  }, [onPlaybackEnd]);
  
  // Interrupt AI (Grok-style)
  const interruptAI = useCallback(() => {
    if (voiceState.state !== 'SPEAKING') return;
    
    console.log('🚨 Interrupting AI speech (Grok-style)');
    
    // Fade out current audio
    if (currentAudioRef.current) {
      const audio = currentAudioRef.current;
      const fadeOutDuration = 300; // 300ms fade out
      const startVolume = audio.volume;
      const startTime = Date.now();
      
      const fadeOut = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / fadeOutDuration;
        
        if (progress < 1) {
          audio.volume = startVolume * (1 - progress);
          requestAnimationFrame(fadeOut);
        } else {
          audio.pause();
          audio.currentTime = 0;
        }
      };
      
      fadeOut();
    }
    
    stopPlayback();
    dispatch({ type: 'INTERRUPT' });
    onInterrupt();
    
    // Add 1s cooldown to prevent race conditions
    if (interruptionCooldownRef.current) {
      clearTimeout(interruptionCooldownRef.current);
    }
    
    interruptionCooldownRef.current = setTimeout(() => {
      console.log('✅ Interruption cooldown complete - ready for new input');
      startListening();
    }, 1000);
  }, [voiceState.state, stopPlayback, onInterrupt, startListening]);
  
  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = newVolume;
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopPlayback();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current);
      }
      
      if (interruptionCooldownRef.current) {
        clearTimeout(interruptionCooldownRef.current);
      }
    };
  }, [stopListening, stopPlayback]);
  
  return {
    voiceState,
    startListening,
    stopListening,
    toggleListening,
    playText,
    stopPlayback,
    interruptAI,
    setVolume
  };
}