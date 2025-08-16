import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GrokStyleOrb } from "./GrokStyleOrb";
import { VoiceInputControls } from "./VoiceInputControls";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Square, Send, Keyboard, Volume2 } from "lucide-react";

interface VoiceFirstInterfaceProps {
  onSubmit: (message: string) => void;
  isStreaming: boolean;
  isInterrupted: boolean;
  onInterrupt: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function VoiceFirstInterface({
  onSubmit,
  isStreaming,
  isInterrupted,
  onInterrupt,
  placeholder = "Speak or type your spiritual question...",
  disabled = false,
  className = ""
}: VoiceFirstInterfaceProps) {
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'interrupted'>('idle');
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        setOrbState('listening');
        console.log('🎤 Voice recognition started');
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setVoiceTranscript(finalTranscript.trim());
          console.log('🎤 Final transcript:', finalTranscript);
          
          // Auto-submit after 2 seconds of silence
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            if (finalTranscript.trim()) {
              handleVoiceSubmit(finalTranscript.trim());
            }
          }, 2000);
        } else {
          setVoiceTranscript(interimTranscript);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('🎤 Speech recognition error:', event.error);
        setIsListening(false);
        setOrbState('idle');
      };
      
      recognition.onend = () => {
        setIsListening(false);
        if (orbState !== 'processing') {
          setOrbState('idle');
        }
        console.log('🎤 Voice recognition ended');
      };
      
      recognitionRef.current = recognition;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [orbState]);

  // Update orb state based on app state
  useEffect(() => {
    if (isInterrupted) {
      setOrbState('interrupted');
    } else if (isStreaming) {
      setOrbState('responding');
    } else if (isProcessing) {
      setOrbState('processing');
    } else if (isListening) {
      setOrbState('listening');
    } else {
      setOrbState('idle');
    }
  }, [isListening, isProcessing, isStreaming, isInterrupted]);

  const startVoiceInput = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setVoiceTranscript("");
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [isListening]);

  const handleVoiceSubmit = (transcript: string) => {
    setIsProcessing(true);
    setOrbState('processing');
    stopVoiceInput();
    
    setTimeout(() => {
      onSubmit(transcript);
      setVoiceTranscript("");
      setIsProcessing(false);
    }, 500);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      setIsProcessing(true);
      setOrbState('processing');
      
      setTimeout(() => {
        onSubmit(textInput.trim());
        setTextInput("");
        setIsProcessing(false);
      }, 300);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const toggleInputMode = () => {
    if (isListening) {
      stopVoiceInput();
    }
    setInputMode(prev => prev === 'voice' ? 'text' : 'voice');
    setVoiceTranscript("");
    setTextInput("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Compact Mode Toggle & Orb Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GrokStyleOrb state={orbState} size="sm" />
          <Button
            variant={inputMode === 'voice' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleInputMode}
            className="flex items-center gap-1 h-8 px-3 text-xs"
          >
            {inputMode === 'voice' ? <Mic className="h-3 w-3" /> : <Keyboard className="h-3 w-3" />}
            {inputMode === 'voice' ? 'Voice' : 'Text'}
          </Button>
          
          {orbState === 'responding' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onInterrupt}
              className="text-red-600 hover:text-red-700 border-red-300 h-8 px-3 text-xs"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {orbState === 'idle' && 'Ready'}
          {orbState === 'listening' && 'Listening...'}
          {orbState === 'processing' && 'Processing...'}
          {orbState === 'responding' && 'Responding...'}
          {orbState === 'interrupted' && 'Stopped'}
        </div>
      </div>

      {/* Compact Voice Input Mode */}
      {inputMode === 'voice' && (
        <div className="space-y-2">
          <div className={cn(
            "relative p-3 rounded-lg border transition-all duration-300",
            isListening 
              ? "border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50" 
              : "border-gray-200 bg-gray-50"
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">
                {isListening ? 'Listening...' : 'Voice Input'}
              </span>
              {isListening && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-red-600">Recording</span>
                </div>
              )}
            </div>
            
            <div className="min-h-[40px] flex items-center">
              {voiceTranscript ? (
                <p className="text-sm text-gray-900">{voiceTranscript}</p>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  {isListening ? 'Speak now...' : 'Click microphone to start'}
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <Button
                variant={isListening ? "destructive" : "default"}
                size="sm"
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                disabled={disabled || isProcessing}
                className="flex items-center gap-1 h-8 px-3 text-xs"
              >
                {isListening ? (
                  <>
                    <MicOff className="h-3 w-3" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-3 w-3" />
                    Speak
                  </>
                )}
              </Button>
              
              {voiceTranscript && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVoiceSubmit(voiceTranscript)}
                  disabled={disabled || isProcessing}
                  className="flex items-center gap-1 h-8 px-3 text-xs"
                >
                  <Send className="h-3 w-3" />
                  Send
                </Button>
              )}
            </div>
          </div>
          
          {/* Compact Voice Waveform */}
          {isListening && (
            <div className="flex items-center justify-center gap-1 py-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-teal-500 rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 150}ms`,
                    height: `${6 + (Math.sin(Date.now() * 0.001 + i) * 3)}px`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compact Text Input Mode */}
      {inputMode === 'text' && (
        <div className="space-y-1">
          <div className="relative">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled || isProcessing}
              className="min-h-[60px] pr-12 resize-none text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || disabled || isProcessing}
              className="absolute bottom-2 right-2 h-7 w-7 p-0"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}