import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  Square, 
  AlertCircle, 
  Headphones,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScholarPersona } from './ScholarPersonas';

interface GrokStyleVoiceInterfaceProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  selectedPersona: ScholarPersona | null;
  onInterrupt: () => void;
  isStreaming: boolean;
}

interface VoiceState {
  isListening: boolean;
  transcript: string;
  audioLevel: number;
  autoSendDelay: number;
  confidence: number;
}

export function GrokStyleVoiceInterface({
  onSendMessage,
  isLoading,
  selectedPersona,
  onInterrupt,
  isStreaming
}: GrokStyleVoiceInterfaceProps) {
  const { toast } = useToast();
  
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    transcript: '',
    audioLevel: 0,
    autoSendDelay: 1500,
    confidence: 0
  });

  const [isInterrupted, setIsInterrupted] = useState(false);
  const [showEchoWarning, setShowEchoWarning] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize voice recognition with fallbacks
  const initializeRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive"
      });
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true }));
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence || 0.9;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          setState(prev => ({ 
            ...prev, 
            transcript: finalTranscript,
            confidence 
          }));
          
          // Auto-send with confidence check
          if (confidence > 0.8) {
            scheduleAutoSend(finalTranscript);
          }
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onspeechend = () => {
      scheduleAutoSend();
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setState(prev => ({ ...prev, isListening: false }));
      
      if (event.error === 'no-speech') {
        toast({
          title: "No Speech Detected",
          description: "Try speaking closer to your microphone",
          variant: "default"
        });
      }
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
    };

    return recognition;
  }, [toast]);

  // Schedule auto-send after pause
  const scheduleAutoSend = useCallback((transcriptOverride?: string) => {
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
    }

    autoSendTimeoutRef.current = setTimeout(() => {
      const finalTranscript = transcriptOverride || state.transcript;
      
      if (finalTranscript.trim() && state.confidence > 0.8) {
        console.log('🚀 Auto-sending voice message:', finalTranscript);
        onSendMessage(finalTranscript.trim());
        setState(prev => ({ ...prev, transcript: '' }));
      }
    }, state.autoSendDelay);
  }, [state.transcript, state.confidence, state.autoSendDelay, onSendMessage]);

  // Start listening
  const startListening = useCallback(async () => {
    const recognition = initializeRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    recognition.start();

    // Initialize audio monitoring for levels
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Monitor audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkLevel = () => {
        if (analyser && state.isListening) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setState(prev => ({ ...prev, audioLevel: average }));
          requestAnimationFrame(checkLevel);
        }
      };
      checkLevel();

    } catch (error) {
      console.error('Audio context setup failed:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access and try again",
          variant: "destructive"
        });
      }
    }
  }, [initializeRecognition, state.isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setState(prev => ({ ...prev, isListening: false, transcript: '', audioLevel: 0 }));
  }, []);

  // Handle interruption
  const handleInterruption = useCallback(() => {
    if (isStreaming) {
      onInterrupt();
      setIsInterrupted(true);
      
      toast({
        title: "Response Interrupted",
        description: "Ready for your next question",
        variant: "default"
      });
      
      setTimeout(() => setIsInterrupted(false), 2000);
    }
  }, [isStreaming, onInterrupt, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current);
      }
    };
  }, [stopListening]);

  // Generate audio waveform
  const generateWaveform = () => {
    const bars = [];
    const barCount = 5;
    
    for (let i = 0; i < barCount; i++) {
      const height = state.isListening 
        ? Math.max(4, (state.audioLevel / 255) * 20 + Math.random() * 8)
        : 4;
      
      bars.push(
        <div
          key={i}
          className={cn(
            "bg-teal-400 rounded-full transition-all duration-150",
            state.isListening ? "animate-pulse" : ""
          )}
          style={{
            width: '2px',
            height: `${height}px`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      );
    }
    
    return bars;
  };

  // Get orb color based on state
  const getOrbState = () => {
    if (isInterrupted) return { color: 'bg-red-500 border-red-300', label: 'Interrupted' };
    if (isStreaming) return { color: 'bg-purple-500 border-purple-300', label: 'AI Responding' };
    if (state.isListening) return { color: 'bg-teal-500 border-teal-300', label: 'Listening' };
    if (isLoading) return { color: 'bg-yellow-500 border-yellow-300', label: 'Processing' };
    return { color: 'bg-teal-500 border-teal-300', label: 'Ready' };
  };

  const orbState = getOrbState();

  return (
    <div className="space-y-3">
      {/* Echo cancellation warning */}
      {showEchoWarning && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-xs">
          <Headphones className="w-4 h-4" />
          <span>Consider using headphones to prevent feedback</span>
        </div>
      )}

      {/* Main Voice Interface */}
      <div className="flex items-center gap-4">
        {/* Grok-style Orb Button */}
        <Button
          onClick={state.isListening ? stopListening : startListening}
          disabled={isLoading}
          className={cn(
            "w-12 h-12 rounded-full transition-all duration-300 shadow-lg border-2",
            orbState.color,
            state.isListening ? "scale-105 animate-pulse" : "hover:scale-105",
            isInterrupted && "animate-pulse"
          )}
        >
          {state.isListening ? (
            <Square className="w-5 h-5 text-white" />
          ) : isInterrupted ? (
            <AlertCircle className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </Button>

        {/* Voice Activity Waveform */}
        {state.isListening && (
          <div className="flex items-end gap-1 h-6">
            {generateWaveform()}
          </div>
        )}

        {/* Status Display */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">
            {orbState.label}
          </p>
          {state.transcript && (
            <p className="text-xs text-gray-500 truncate max-w-xs">
              "{state.transcript}"
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Auto-send delay */}
          <select
            value={state.autoSendDelay}
            onChange={(e) => setState(prev => ({ ...prev, autoSendDelay: Number(e.target.value) }))}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
            disabled={state.isListening}
          >
            <option value={1000}>1s</option>
            <option value={1500}>1.5s</option>
            <option value={2000}>2s</option>
            <option value={2500}>2.5s</option>
            <option value={3000}>3s</option>
          </select>
          
          {/* Interrupt button */}
          {isStreaming && (
            <Button
              onClick={handleInterruption}
              size="sm"
              variant="outline"
              className="text-xs h-6 px-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Persona indicator */}
      {selectedPersona && state.isListening && (
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
          <selectedPersona.icon className={cn("w-4 h-4", selectedPersona.iconColor)} />
          <span>Speaking with {selectedPersona.name}</span>
        </div>
      )}
    </div>
  );
}