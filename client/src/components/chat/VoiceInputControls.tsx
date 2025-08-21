import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Keyboard, 
  Square, 
  Pause,
  Play,
  Volume2,
  VolumeX
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputControlsProps {
  onTranscript: (text: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onInterrupt?: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  addEventListener(type: 'result', listener: (event: SpeechRecognitionEvent) => void): void;
  addEventListener(type: 'error', listener: (event: SpeechRecognitionErrorEvent) => void): void;
  addEventListener(type: 'end', listener: () => void): void;
  addEventListener(type: 'start', listener: () => void): void;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export function VoiceInputControls({
  onTranscript,
  onSend,
  disabled = false,
  isStreaming = false,
  onInterrupt
}: VoiceInputControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [showWaveform, setShowWaveform] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [pauseTimeout, setPauseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isContinuousListening, setIsContinuousListening] = useState(false);
  const [backgroundListener, setBackgroundListener] = useState<any>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.addEventListener('result', (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setConfidence(confidence);
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setCurrentTranscript(fullTranscript);
        onTranscript(fullTranscript);

        // Clear existing timeout
        if (pauseTimeout) {
          clearTimeout(pauseTimeout);
        }

        // Auto-send after 1.5s pause if confidence is high enough
        if (finalTranscript && confidence > 0.8) {
          const timeout = setTimeout(() => {
            handleAutoSend(finalTranscript);
          }, 1500);
          setPauseTimeout(timeout);
        }
      });

      recognition.addEventListener('error', (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setShowWaveform(false);
      });

      recognition.addEventListener('end', () => {
        setIsListening(false);
        setShowWaveform(false);
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (pauseTimeout) {
        clearTimeout(pauseTimeout);
      }
    };
  }, []);

  const handleAutoSend = (text: string) => {
    if (text.trim() && confidence > 0.8) {
      onSend(text.trim());
      setCurrentTranscript("");
      stopListening();
    }
  };

  const startListening = () => {
    if (!recognitionRef.current || disabled) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setShowWaveform(true);
      setCurrentTranscript("");
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setShowWaveform(false);
    if (pauseTimeout) {
      clearTimeout(pauseTimeout);
      setPauseTimeout(null);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleInterrupt = () => {
    if (isStreaming && onInterrupt) {
      onInterrupt();
      stopListening();
    }
  };

  // Animated waveform bars
  const WaveformBars = () => (
    <div className="flex items-center justify-center gap-1 h-6">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 bg-teal-500 rounded-full animate-pulse",
            showWaveform ? "h-3 animate-bounce" : "h-1"
          )}
          style={{
            animationDelay: `${i * 100}ms`,
            animationDuration: `${800 + i * 200}ms`
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Voice Control Button */}
      <div className="flex items-center justify-center">
        <Button
          onClick={toggleListening}
          disabled={disabled || !isSupported}
          className={cn(
            "w-12 h-12 rounded-full border-2 transition-all duration-300",
            isListening
              ? "bg-teal-500 hover:bg-teal-600 text-white border-teal-400 scale-105 shadow-lg ring-2 ring-teal-200"
              : "bg-white hover:bg-teal-50 text-teal-600 border-teal-200 hover:border-teal-400 shadow-md hover:scale-105"
          )}
          title={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? (
            <Square className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Waveform Visualization */}
      {showWaveform && (
        <div className="flex flex-col items-center space-y-2">
          <WaveformBars />
          <div className="text-center">
            <p className="text-sm text-gray-600">Listening...</p>
            {confidence > 0 && (
              <Badge variant="secondary" className="text-xs mt-1">
                Confidence: {Math.round(confidence * 100)}%
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Current Transcript */}
      {currentTranscript && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-800">{currentTranscript}</p>
          {confidence > 0.8 && (
            <p className="text-xs text-green-600 mt-1">Ready to send...</p>
          )}
        </div>
      )}

      {/* Interrupt Button (when streaming) */}
      {isStreaming && (
        <div className="flex justify-center">
          <Button
            onClick={handleInterrupt}
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Pause className="h-4 w-4 mr-1" />
            Interrupt
          </Button>
        </div>
      )}

      {/* Input Mode Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <Button
            variant={inputMode === 'voice' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setInputMode('voice')}
            className={cn(
              "text-xs px-3 py-1",
              inputMode === 'voice' ? "bg-teal-500 text-white" : "text-gray-600"
            )}
            disabled={!isSupported}
          >
            <Mic className="h-3 w-3 mr-1" />
            Voice
          </Button>
          <Button
            variant={inputMode === 'text' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setInputMode('text')}
            className={cn(
              "text-xs px-3 py-1",
              inputMode === 'text' ? "bg-gray-700 text-white" : "text-gray-600"
            )}
          >
            <Keyboard className="h-3 w-3 mr-1" />
            Text
          </Button>
        </div>
      </div>

      {/* Browser Support Notice */}
      {!isSupported && (
        <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-800">
            Voice input not supported in this browser. Use text mode instead.
          </p>
        </div>
      )}
    </div>
  );
}