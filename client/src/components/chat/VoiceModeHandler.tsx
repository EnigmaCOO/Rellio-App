
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

export function useVoiceModeHandler({
  onTranscript,
  onAutoSend,
  onStateChange,
  onInterrupt,
  disabled = false,
  isAIResponding = false,
  autoSendDelay = 1500,
  confidenceThreshold = 0.85,
  interruptionSensitivity = 0.3,
  voiceId = 'ErXwobaYiN019PkySvjV'
}: VoiceModeHandlerProps): VoiceModeHandlerReturn {
  
  // Core voice state
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // ElevenLabs TTS state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Enhanced refs for managing instances and timeouts
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const isInitializingRef = useRef(false);
  const speechEndCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRequestRef = useRef<string | null>(null);

  // Check support and permissions on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    // Check microphone permission
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

    // Stop audio streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop TTS audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    // Reset state
    setIsListening(false);
    setCurrentTranscript('');
    setAudioLevel(0);
    setConfidence(0);
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentAudio(null);
    speechEndCountRef.current = 0;
    lastSpeechTimeRef.current = 0;
    activeRequestRef.current = null;
    updateVoiceState('idle');
  }, [updateVoiceState]);

  // Initialize audio context with echo cancellation
  const initializeAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16
        } 
      });
      streamRef.current = stream;
      setHasPermission(true);

      console.log('🎤 Audio stream initialized with echo cancellation');

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      microphone.connect(gainNode);
      gainNode.connect(analyser);

      gainNode.gain.value = 1; // Start unmuted
      console.log('🎤 Microphone initialized and ready');

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      gainNodeRef.current = gainNode;

      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);

          // Enhanced interruption detection during AI speech
          if ((voiceState === 'speaking' || isAIResponding) && average > 50) {
            console.log('🚨 AUDIO-LEVEL INTERRUPTION! High audio detected during AI speech');
            interruptAI();
          }
        }
        requestAnimationFrame(monitorAudioLevel);
      };

      monitorAudioLevel();
    } catch (error) {
      console.error('🚨 Audio context initialization error:', error);
      setHasPermission(false);
    }
  }, [voiceState, isAIResponding]);

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
      
      const silenceWindow = Math.random() * 1000 + 1000; // 1-2 second window
      
      silenceDetectionRef.current = setTimeout(() => {
        const now = Date.now();
        const timeSinceLastSpeech = now - lastSpeechTimeRef.current;
        
        console.log('⏰ Silence window completed. Time since last speech:', timeSinceLastSpeech);
        
        if (timeSinceLastSpeech >= 1000 && transcript.trim()) {
          console.log('🚀 Auto-send confirmed - sufficient silence and valid transcript');
          
          setCurrentTranscript('');
          setIsListening(false);
          updateVoiceState('processing');
          
          onAutoSend(transcript.trim());
          
          setTimeout(() => updateVoiceState('idle'), 500);
        } else {
          console.log('⚠️ Auto-send cancelled - insufficient silence or empty transcript');
        }
      }, silenceWindow);
    }, 300);
  }, [confidenceThreshold, onAutoSend, updateVoiceState]);

  // Start listening with enhanced features
  const startListening = useCallback(async (): Promise<boolean> => {
    console.log('🎤 Starting listening...');
    
    if (!isSupported || disabled || isInitializingRef.current) {
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
        setAudioLevel(0.5);
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
            lastSpeechTimeRef.current = Date.now();
          } else {
            interimTranscript += transcript + ' ';
            lastSpeechTimeRef.current = Date.now();
          }
        }
        
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        console.log('📝 Enhanced transcript:', fullTranscript, 'confidence:', maxConfidence);
        
        setCurrentTranscript(fullTranscript);
        setConfidence(maxConfidence);
        onTranscript(fullTranscript, interimTranscript.length > 0);
        
        if (finalTranscript.trim()) {
          console.log('🎯 Final transcript detected, initiating auto-send logic');
          handleSilenceDetection(finalTranscript.trim(), maxConfidence);
        }
      };

      recognition.onspeechend = () => {
        console.log('🗣️ Speech ended detected');
        speechEndCountRef.current += 1;
        
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

      recognition.start();
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start recognition:', error);
      isInitializingRef.current = false;
      cleanup();
      return false;
    }
  }, [isSupported, disabled, cleanup, updateVoiceState, onTranscript, handleSilenceDetection, confidence, confidenceThreshold, voiceState, currentTranscript]);

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

  // Enhanced ElevenLabs TTS integration
  const cleanTextForSpeech = useCallback((text: string): string => {
    return text
      .replace(/<perspective>[^<]*<\/perspective>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const playText = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    const cleanedText = cleanTextForSpeech(text);
    const requestId = `${cleanedText.substring(0, 50)}_${voiceId}`;
    
    if (activeRequestRef.current === requestId) {
      console.log('🚫 Duplicate request blocked:', requestId);
      return;
    }
    
    if (isPlaying || isLoading) {
      console.log('🛑 Stopping existing playback for new request');
      stopPlayback();
    }
    
    activeRequestRef.current = requestId;

    if (!cleanedText.trim()) {
      console.log('🔊 No readable text after cleaning');
      return;
    }

    const maxLength = 600;
    const textToSpeak = cleanedText.length > maxLength ? cleanedText.substring(0, maxLength) + '...' : cleanedText;
    
    console.log('🔊 Starting ElevenLabs TTS for:', textToSpeak.substring(0, 50) + '...');
    
    try {
      setIsLoading(true);
      updateVoiceState('speaking');

      // Mute microphone during TTS
      if (gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        console.log('🔇 MICROPHONE MUTED: Preventing AI audio feedback');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak.trim(),
          voiceId,
          options: {
            stability: 0.3,
            similarityBoost: 0.9,
            style: 0.4,
            useSpeakerBoost: true,
            optimizeStreamingLatency: 3
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('🔊 Audio data received:', arrayBuffer.byteLength, 'bytes');
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Empty audio data received');
      }

      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      
      // Create audio element
      const audio = new Audio();
      audio.volume = Math.max(0.3, Math.min(volume, 1.0));
      audio.crossOrigin = 'anonymous';
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audio.onplay = () => {
        console.log('🔊 Audio playback started');
        setIsPlaying(true);
        setIsLoading(false);
        setCurrentAudio(audio);
      };

      audio.onended = () => {
        console.log('🔊 Audio playback completed');
        setIsPlaying(false);
        setCurrentAudio(null);
        updateVoiceState('idle');
        
        // Unmute microphone
        if (gainNodeRef.current && audioContextRef.current) {
          gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime);
          console.log('🎤 MICROPHONE UNMUTED: Ready for user input');
        }
        
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (error) {
          console.warn('🔊 URL cleanup warning:', error);
        }
      };

      audio.onerror = (event) => {
        console.error('🔊 Audio playback error:', event);
        setIsPlaying(false);
        setIsLoading(false);
        setCurrentAudio(null);
        updateVoiceState('idle');
        
        // Unmute microphone on error
        if (gainNodeRef.current && audioContextRef.current) {
          gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime);
        }
        
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (error) {
          console.warn('🔊 URL cleanup error:', error);
        }
      };
      
      audio.src = audioUrl;
      audio.load();
      await audio.play();

      audioRef.current = audio;

    } catch (error) {
      console.log('🔊 ElevenLabs failed, using browser speech:', error);
      setIsLoading(false);
      
      // Fallback to browser speech synthesis
      try {
        if ('speechSynthesis' in window && window.speechSynthesis) {
          console.log('🔊 Using browser speech synthesis fallback');
          
          window.speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.volume = Math.min(volume, 1.0);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          
          const voices = window.speechSynthesis.getVoices();
          const englishVoice = voices.find(voice => 
            voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
          );
          if (englishVoice) {
            utterance.voice = englishVoice;
          }
          
          utterance.onstart = () => {
            setIsPlaying(true);
            setIsLoading(false);
          };
          
          utterance.onend = () => {
            setIsPlaying(false);
            setCurrentAudio(null);
            updateVoiceState('idle');
            
            // Unmute microphone
            if (gainNodeRef.current && audioContextRef.current) {
              gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime);
            }
          };
          
          utterance.onerror = () => {
            setIsPlaying(false);
            setIsLoading(false);
            setCurrentAudio(null);
            updateVoiceState('idle');
            
            // Unmute microphone
            if (gainNodeRef.current && audioContextRef.current) {
              gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime);
            }
          };
          
          setIsPlaying(true);
          setIsLoading(false);
          window.speechSynthesis.speak(utterance);
        }
      } catch (fallbackError) {
        console.error('🔊 Browser speech synthesis failed:', fallbackError);
        setIsLoading(false);
        updateVoiceState('idle');
        
        // Unmute microphone
        if (gainNodeRef.current && audioContextRef.current) {
          gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime);
        }
      }
    }
  }, [voiceId, volume, cleanTextForSpeech, updateVoiceState]);

  const stopPlayback = useCallback(() => {
    console.log('🔊 Interruption detected - stopping all audio immediately');
    
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentAudio(null);
    updateVoiceState('interrupted');
    
    // Stop ElevenLabs audio
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        
        const oldSrc = audioRef.current.src;
        audioRef.current.src = '';
        if (oldSrc && oldSrc.startsWith('blob:')) {
          URL.revokeObjectURL(oldSrc);
        }
      } catch (error) {
        console.warn('🔊 Audio cleanup error (non-critical):', error);
      }
    }
    
    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        console.log('🔊 Browser speech synthesis stopped immediately');
      } catch (error) {
        console.warn('🔊 Browser speech stop error:', error);
      }
    }
    
    // Unmute microphone immediately after interruption
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime);
      console.log('🎤 MICROPHONE UNMUTED: Ready for user input after interruption');
    }
    
    // Brief delay before returning to idle
    setTimeout(() => {
      if (voiceState === 'interrupted') {
        updateVoiceState('idle');
      }
    }, 500);
  }, [voiceState, updateVoiceState]);

  const interruptAI = useCallback(() => {
    console.log('🛑 Interrupting AI');
    stopPlayback();
    onInterrupt();
  }, [stopPlayback, onInterrupt]);

  // Initialize audio context on mount
  useEffect(() => {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      initializeAudioContext();
    }
  }, [initializeAudioContext]);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

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
    interruptAI,
    // ElevenLabs TTS methods
    playText,
    stopPlayback,
    isPlaying,
    isLoading,
    volume,
    setVolume
  };
}
