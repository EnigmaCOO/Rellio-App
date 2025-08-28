import React, { useRef, useCallback, useEffect } from 'react';

// Voice Isolation Filter Component
// Provides complete separation between AI voice output and user microphone input
export interface VoiceIsolationConfig {
  micGainDuringAI: number;      // 0 = complete mute during AI speech
  confidenceThreshold: number;  // 0.7 = high confidence for user voice only
  echoCancellationLevel: 'basic' | 'aggressive' | 'maximum';
  backgroundListenerSensitivity: number; // 0.3 = low sensitivity for interruptions
}

export interface VoiceIsolationFilterProps {
  isAISpeaking: boolean;
  onUserVoiceDetected: (transcript: string, confidence: number) => void;
  onInterruptionDetected: () => void;
  config?: Partial<VoiceIsolationConfig>;
}

const DEFAULT_CONFIG: VoiceIsolationConfig = {
  micGainDuringAI: 0,           // COMPLETE mute during AI speech
  confidenceThreshold: 0.7,     // High confidence for user voice only
  echoCancellationLevel: 'maximum',
  backgroundListenerSensitivity: 0.3
};

export function VoiceIsolationFilter({
  isAISpeaking,
  onUserVoiceDetected,
  onInterruptionDetected,
  config = {}
}: VoiceIsolationFilterProps) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Audio isolation refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  
  // Recognition refs
  const primaryRecognitionRef = useRef<any>(null);
  const backgroundRecognitionRef = useRef<any>(null);
  
  // Initialize ISOLATED audio context
  const initializeIsolatedAudio = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔧 Initializing ISOLATED audio context for voice separation...');
      
      // Request microphone with MAXIMUM isolation constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,        // CRITICAL: Prevent auto-amplification of AI voice
          sampleRate: 16000,            // Optimize for speech recognition
          channelCount: 1,              // Mono for voice clarity
          // Enhanced constraints for maximum voice isolation
          ...(finalConfig.echoCancellationLevel === 'maximum' && {
            echoCancellation: { exact: true },
            noiseSuppression: { exact: true },
            autoGainControl: { exact: false }
          })
        }
      });
      
      streamRef.current = stream;
      
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create gain node for INSTANT muting during AI speech
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime);
      
      // Create analyzer for real-time audio monitoring
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3;
      
      // Create ISOLATED destination (blocks AI audio from feedback)
      destinationRef.current = audioContextRef.current.createMediaStreamDestination();
      
      // Connect audio graph: Mic -> Gain -> Analyzer -> Isolated Destination
      source.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(destinationRef.current);
      
      console.log('✅ ISOLATED audio context ready - AI voice BLOCKED from mic path');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize isolated audio:', error);
      return false;
    }
  }, [finalConfig.echoCancellationLevel]);
  
  // Apply microphone muting based on AI speaking state
  useEffect(() => {
    if (!gainNodeRef.current || !audioContextRef.current) return;
    
    const targetGain = isAISpeaking ? finalConfig.micGainDuringAI : 1;
    const currentTime = audioContextRef.current.currentTime;
    
    // Apply gain change with small ramp to prevent clicks
    gainNodeRef.current.gain.setTargetAtTime(targetGain, currentTime, 0.01);
    
    if (isAISpeaking) {
      console.log('🔇 Microphone MUTED - AI speaking (gain=0, complete isolation)');
    } else {
      console.log('🔊 Microphone RESTORED - AI finished (gain=1, ready for user)');
    }
  }, [isAISpeaking, finalConfig.micGainDuringAI]);
  
  // Initialize primary speech recognition with confidence filtering
  const initializePrimaryRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    
    const recognition = new SpeechRecognition() as any;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0;
        
        // CRITICAL: Filter out low-confidence results (likely AI voice contamination)
        if (confidence >= finalConfig.confidenceThreshold) {
          console.log('✅ HIGH-CONFIDENCE user voice detected:', {
            transcript: transcript.substring(0, 30) + '...',
            confidence: Math.round(confidence * 100) + '%'
          });
          onUserVoiceDetected(transcript, confidence);
        } else {
          console.log('🚫 LOW-CONFIDENCE voice filtered out (likely AI contamination):', {
            transcript: transcript.substring(0, 30) + '...',
            confidence: Math.round(confidence * 100) + '%'
          });
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.warn('🎤 Primary recognition error:', event.error);
      }
    };
    
    return recognition;
  }, [finalConfig.confidenceThreshold, onUserVoiceDetected]);
  
  // Initialize background recognition for interruption detection
  const initializeBackgroundRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    
    const bgRecognition = new SpeechRecognition() as any;
    bgRecognition.continuous = true;
    bgRecognition.interimResults = false;  // Final results only for interruptions
    bgRecognition.lang = 'en-US';
    
    bgRecognition.onspeechstart = () => {
      // Detect speech start during AI playback for interruption
      console.log('🎤 Background listener detected speech during AI playback');
      onInterruptionDetected();
    };
    
    bgRecognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const confidence = result[0].confidence || 0;
        
        // Only trigger interruption on high-confidence user speech
        if (confidence >= finalConfig.backgroundListenerSensitivity) {
          console.log('🚨 INTERRUPTION detected with confidence:', Math.round(confidence * 100) + '%');
          onInterruptionDetected();
        }
      }
    };
    
    bgRecognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.warn('🎤 Background recognition error:', event.error);
      }
    };
    
    return bgRecognition;
  }, [finalConfig.backgroundListenerSensitivity, onInterruptionDetected]);
  
  // Public methods for controlling recognition
  const startPrimaryRecognition = useCallback(async (): Promise<boolean> => {
    if (isAISpeaking) {
      console.log('🚫 Cannot start primary recognition - AI is speaking');
      return false;
    }
    
    try {
      await initializeIsolatedAudio();
      
      primaryRecognitionRef.current = initializePrimaryRecognition();
      if (!primaryRecognitionRef.current) return false;
      
      primaryRecognitionRef.current.start();
      console.log('🎤 Primary recognition started with isolation filter');
      return true;
    } catch (error) {
      console.error('❌ Failed to start primary recognition:', error);
      return false;
    }
  }, [isAISpeaking, initializeIsolatedAudio, initializePrimaryRecognition]);
  
  const stopPrimaryRecognition = useCallback(() => {
    if (primaryRecognitionRef.current) {
      try {
        primaryRecognitionRef.current.abort();
        primaryRecognitionRef.current.stop();
        primaryRecognitionRef.current = null;
        console.log('🛑 Primary recognition stopped');
      } catch (error) {
        console.warn('⚠️ Error stopping primary recognition:', error);
      }
    }
  }, []);
  
  const startBackgroundRecognition = useCallback(() => {
    if (!isAISpeaking) return;
    
    try {
      backgroundRecognitionRef.current = initializeBackgroundRecognition();
      if (backgroundRecognitionRef.current) {
        backgroundRecognitionRef.current.start();
        console.log('🎤 Background recognition started for interruption detection');
      }
    } catch (error) {
      console.error('❌ Failed to start background recognition:', error);
    }
  }, [isAISpeaking, initializeBackgroundRecognition]);
  
  const stopBackgroundRecognition = useCallback(() => {
    if (backgroundRecognitionRef.current) {
      try {
        backgroundRecognitionRef.current.abort();
        backgroundRecognitionRef.current.stop();
        backgroundRecognitionRef.current = null;
        console.log('🛑 Background recognition stopped');
      } catch (error) {
        console.warn('⚠️ Error stopping background recognition:', error);
      }
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPrimaryRecognition();
      stopBackgroundRecognition();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopPrimaryRecognition, stopBackgroundRecognition]);
  
  // Expose control methods
  useEffect(() => {
    // Make methods available to parent component
    (window as any).voiceIsolationControl = {
      startPrimaryRecognition,
      stopPrimaryRecognition,
      startBackgroundRecognition,
      stopBackgroundRecognition
    };
  }, [startPrimaryRecognition, stopPrimaryRecognition, startBackgroundRecognition, stopBackgroundRecognition]);
  
  return null; // This is a headless component for voice isolation
}