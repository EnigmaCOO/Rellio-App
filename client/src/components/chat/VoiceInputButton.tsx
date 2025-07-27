import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface VoiceInputButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscription, disabled = false }: VoiceInputButtonProps) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionClass) {
      setIsSupported(true);
      const recognitionInstance = new SpeechRecognitionClass() as SpeechRecognition;
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
        console.log('🎤 Voice input started');
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
        console.log('🎤 Voice input ended');
      };
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0]?.transcript;
        if (transcript) {
          console.log('🎤 Voice transcription:', transcript);
          onTranscription(transcript.trim());
          toast({
            title: "Voice captured",
            description: transcript,
          });
        }
      };
      
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('🎤 Voice recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice input error",
          description: "Could not capture voice. Please try again.",
          variant: "destructive",
        });
      };
      
      setRecognition(recognitionInstance);
    } else {
      setIsSupported(false);
      console.warn('🎤 Speech recognition not supported');
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onTranscription, toast]);

  const startListening = () => {
    if (recognition && !isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.error('🎤 Failed to start recognition:', error);
        toast({
          title: "Voice input unavailable",
          description: "Please check microphone permissions",
          variant: "destructive",
        });
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  if (!isSupported) {
    return null; // Hide button if not supported
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={isListening ? "destructive" : "outline"}
      className={`
        relative rounded-full w-10 h-10 p-0 border-2 transition-all duration-200
        ${isListening 
          ? 'bg-red-500 hover:bg-red-600 border-red-300 shadow-lg shadow-red-500/30 animate-pulse' 
          : 'border-teal-300 hover:border-teal-500 hover:bg-teal-50 hover:shadow-lg hover:shadow-teal-500/20'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      title={isListening ? "Stop recording" : "Start voice input"}
    >
      {isListening ? (
        <Square className="w-4 h-4 text-white" />
      ) : (
        <Mic className={`w-4 h-4 ${isListening ? 'text-white' : 'text-teal-600'}`} />
      )}
      
      {/* Waveform animation during listening */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex space-x-0.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-white rounded-full animate-pulse"
                style={{
                  height: '8px',
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '600ms',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </Button>
  );
}