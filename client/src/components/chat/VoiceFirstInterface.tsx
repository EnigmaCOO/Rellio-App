import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send, Volume2, VolumeX, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
  grammars: any;
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

interface VoiceFirstInterfaceProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  context: {
    religion: string | null;
    book: string;
  };
}

type VoiceMode = 'idle' | 'listening' | 'processing' | 'text';
type Language = 'en-US' | 'ar-SA' | 'he-IL' | 'hi-IN' | 'zh-CN';

export function VoiceFirstInterface({ onSendMessage, disabled = false, context }: VoiceFirstInterfaceProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en-US');
  const [micColor, setMicColor] = useState('teal');
  const [sensitivityLevel, setSensitivityLevel] = useState(0.5);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Language detection based on scripture context
  useEffect(() => {
    if (context.religion) {
      const languageMap: Record<string, Language> = {
        'quran': 'ar-SA',
        'torah': 'he-IL',
        'hindu': 'hi-IN',
        'bible': 'en-US',
        'buddhist': 'en-US'
      };
      setSelectedLanguage(languageMap[context.religion] || 'en-US');
    }
  }, [context.religion]);

  // Mic color customization based on scripture theme
  useEffect(() => {
    if (context.religion) {
      const colorMap: Record<string, string> = {
        'quran': 'emerald',
        'torah': 'amber', 
        'hindu': 'orange',
        'bible': 'blue',
        'buddhist': 'purple'
      };
      setMicColor(colorMap[context.religion] || 'teal');
    }
  }, [context.religion]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionClass) {
      setIsSupported(true);
      const recognitionInstance = new SpeechRecognitionClass() as SpeechRecognition;
      
      // Enhanced configuration for continuous listening
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = selectedLanguage;
      recognitionInstance.maxAlternatives = 3;
      
      recognitionInstance.onstart = () => {
        setMode('listening');
        console.log('🎤 Voice-first mode activated');
        startWaveformAnimation();
      };
      
      recognitionInstance.onend = () => {
        if (mode === 'listening') {
          setMode('idle');
          stopWaveformAnimation();
        }
      };
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimText += transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          setMode('processing');
          
          // Smart endpoint detection - pause for silence
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          
          silenceTimeoutRef.current = setTimeout(() => {
            const fullMessage = transcript + finalTranscript;
            if (fullMessage.trim()) {
              handleVoiceComplete(fullMessage.trim());
            }
          }, 1500); // 1.5 second pause detection
        }
        
        setInterimTranscript(interimText);
      };
      
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('🎤 Voice recognition error:', event.error);
        setMode('idle');
        stopWaveformAnimation();
        
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Permission Required",
            description: "Please allow microphone access to use voice input",
            variant: "destructive",
          });
        } else if (event.error === 'no-speech') {
          toast({
            title: "No speech detected",
            description: "Please speak clearly and try again",
            variant: "destructive",
          });
        }
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
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [selectedLanguage, mode, transcript]);

  const startWaveformAnimation = () => {
    const animate = () => {
      if (waveformRef.current && mode === 'listening') {
        const waves = waveformRef.current.children;
        for (let i = 0; i < waves.length; i++) {
          const wave = waves[i] as HTMLElement;
          const height = Math.random() * 20 + 8;
          wave.style.height = `${height}px`;
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const stopWaveformAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const startVoiceInput = () => {
    if (!privacyConsent) {
      toast({
        title: "Privacy Consent Required",
        description: "Please confirm you consent to voice processing",
        variant: "destructive",
      });
      return;
    }

    if (recognition && mode === 'idle') {
      setTranscript("");
      setInterimTranscript("");
      try {
        recognition.lang = selectedLanguage;
        recognition.start();
      } catch (error) {
        console.error('🎤 Failed to start voice recognition:', error);
        toast({
          title: "Voice input failed",
          description: "Please check microphone permissions",
          variant: "destructive",
        });
      }
    }
  };

  const stopVoiceInput = () => {
    if (recognition && mode === 'listening') {
      recognition.stop();
      setMode('idle');
      stopWaveformAnimation();
    }
  };

  const cancelVoiceInput = () => {
    if (recognition) {
      recognition.abort();
    }
    setMode('idle');
    setTranscript("");
    setInterimTranscript("");
    stopWaveformAnimation();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
  };

  const handleVoiceComplete = (message: string) => {
    setMode('idle');
    stopWaveformAnimation();
    setTranscript("");
    setInterimTranscript("");
    onSendMessage(message);
    
    toast({
      title: "Voice message sent",
      description: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
    });
  };

  const switchToTextMode = () => {
    setMode('text');
    cancelVoiceInput();
  };

  const switchToVoiceMode = () => {
    setMode('idle');
    setTextInput("");
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      onSendMessage(textInput.trim());
      setTextInput("");
      setMode('idle');
    }
  };

  const getMicColorClasses = () => {
    const colorMap = {
      'teal': 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/30 border-teal-300',
      'emerald': 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 border-emerald-300',
      'amber': 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 border-amber-300',
      'orange': 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30 border-orange-300',
      'blue': 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30 border-blue-300',
      'purple': 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/30 border-purple-300'
    };
    return colorMap[micColor as keyof typeof colorMap] || colorMap.teal;
  };

  if (!isSupported) {
    // Fallback to text input only
    return (
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (textInput.trim()) {
            onSendMessage(textInput.trim());
            setTextInput("");
          }
        }} className="flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Ask about scripture..."
            className="flex-1"
            disabled={disabled}
          />
          <Button type="submit" disabled={!textInput.trim() || disabled}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    );
  }

  // Voice Mode Active indicator
  const VoiceModeIndicator = () => (
    <div className="absolute top-2 left-2 z-20">
      <Badge className="bg-red-500 text-white animate-pulse">
        <Mic className="w-3 h-3 mr-1" />
        Voice Mode Active
      </Badge>
    </div>
  );

  // Privacy consent overlay
  if (!privacyConsent) {
    return (
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Mic className="w-5 h-5 text-teal-500" />
            <span className="font-medium">Voice Input Available</span>
          </div>
          <p className="text-sm text-gray-600">
            Allow voice processing to interact naturally with the AI Scripture Guide
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              size="sm" 
              onClick={() => setPrivacyConsent(true)}
              className="bg-teal-500 hover:bg-teal-600"
            >
              Enable Voice Mode
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={switchToTextMode}
            >
              Use Text Only
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 relative">
      {mode === 'listening' && <VoiceModeIndicator />}
      
      {mode === 'text' ? (
        // Text input mode
        <form onSubmit={handleTextSubmit} className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your question..."
              className="rounded-full pr-12"
              disabled={disabled}
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              onClick={switchToVoiceMode}
              title="Switch to voice mode"
            >
              <Mic className="w-4 h-4 text-teal-500" />
            </Button>
          </div>
          <Button 
            type="submit" 
            disabled={!textInput.trim() || disabled}
            className="rounded-full bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      ) : (
        // Voice-first interface
        <div className="flex flex-col items-center space-y-3">
          {/* Main Voice Button */}
          <div className="relative">
            <Button
              type="button"
              className={`
                relative w-12 h-12 rounded-full p-0 border-2 transition-all duration-300 transform
                ${getMicColorClasses()}
                ${mode === 'listening' 
                  ? 'scale-110 shadow-lg animate-pulse' 
                  : 'hover:scale-105 shadow-md'
                }
                ${mode === 'processing' ? 'animate-spin' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={mode === 'listening' ? stopVoiceInput : startVoiceInput}
              disabled={disabled}
              title={mode === 'listening' ? "Stop voice input" : "Start speaking"}
            >
              {mode === 'processing' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'listening' ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-white" />
              )}
            </Button>
            
            {/* Mystical mandala animation on hover */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="w-full h-full rounded-full border border-current animate-ping" style={{ animationDuration: '2s' }} />
            </div>
          </div>
          
          {/* Waveform visualization */}
          {mode === 'listening' && (
            <div 
              ref={waveformRef}
              className="flex items-center space-x-1"
            >
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full transition-all duration-75"
                  style={{ 
                    backgroundColor: `var(--${micColor}-500, #14b8a6)`,
                    height: '8px'
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Transcript display */}
          {(transcript || interimTranscript) && (
            <div className="bg-gray-100 rounded-lg p-3 max-w-full">
              <p className="text-sm">
                <span className="text-gray-900">{transcript}</span>
                <span className="text-gray-500 italic">{interimTranscript}</span>
              </p>
            </div>
          )}
          
          {/* Controls row */}
          <div className="flex items-center gap-2">
            {mode === 'listening' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={cancelVoiceInput}
                className="text-xs"
              >
                Cancel
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={switchToTextMode}
              className="text-xs"
              title="Switch to text input"
            >
              Type instead
            </Button>
            
            {/* Language indicator */}
            <Badge variant="outline" className="text-xs">
              {selectedLanguage.split('-')[0].toUpperCase()}
            </Badge>
          </div>
          
          {/* Status text */}
          <p className="text-xs text-gray-500 text-center">
            {mode === 'listening' 
              ? "Listening... Speak naturally about scripture"
              : mode === 'processing'
              ? "Processing your voice input..."
              : "Tap microphone to speak or type your question"
            }
          </p>
        </div>
      )}
    </div>
  );
}