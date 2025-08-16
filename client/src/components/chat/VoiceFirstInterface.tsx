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
  isAIResponding?: boolean;
}

export function VoiceFirstInterface({
  onSubmit,
  isStreaming,
  isInterrupted,
  onInterrupt,
  placeholder = "Speak or type your spiritual question...",
  disabled = false,
  className = "",
  isAIResponding = false
}: VoiceFirstInterfaceProps) {
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'interrupted'>('idle');
  const [isBackgroundListening, setIsBackgroundListening] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const backgroundRecognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const interruptTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize main speech recognition for user input
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      // Add noise reduction and echo cancellation if available
      if ('webkitSpeechRecognition' in window && recognition.webkitAudioTrack) {
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true
          }
        };
        console.log('🎤 Applying audio constraints for better isolation');
      }
      
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
      if (interruptTimeoutRef.current) {
        clearTimeout(interruptTimeoutRef.current);
      }
    };
  }, [orbState]);

  // Initialize background speech recognition for interruption detection
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const backgroundRecognition = new SpeechRecognition();
      
      backgroundRecognition.continuous = true;
      backgroundRecognition.interimResults = true;
      backgroundRecognition.lang = 'en-US';
      
      // Enhanced audio processing for background detection
      if ('webkitSpeechRecognition' in window && backgroundRecognition.webkitAudioTrack) {
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googEchoCancellation2: true
          }
        };
        console.log('🎤 Applying enhanced audio constraints for background detection');
      }
      
      backgroundRecognition.onstart = () => {
        setIsBackgroundListening(true);
        console.log('🎤 Background voice detection started');
      };
      
      backgroundRecognition.onresult = (event: any) => {
        // Detect any speech activity during AI response with better filtering
        if (isAIResponding) {
          let hasValidUserInput = false;
          let detectedText = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.trim().toLowerCase();
            detectedText += transcript + ' ';
            
            // More aggressive interruption detection - respond to ANY clear user input
            if (transcript.length >= 2 && 
                event.results[i][0].confidence > 0.6) { // Lower confidence threshold for faster interruption
              
              // Simple filter for obvious AI voice feedback
              const isLikelyAIFeedback = transcript.includes('perspective') ||
                                       transcript.includes('christianity') ||
                                       transcript.includes('islam') ||
                                       transcript.includes('judaism') ||
                                       transcript.includes('hinduism') ||
                                       transcript.includes('buddhism');
              
              if (!isLikelyAIFeedback) {
                hasValidUserInput = true;
                break;
              }
            }
          }
          
          if (hasValidUserInput) {
            console.log('🎤 Valid user interruption detected during AI response:', detectedText.trim());
            console.log('🎤 Triggering interrupt to stop AI voice');
            onInterrupt();
            
            // Stop background recognition immediately to prevent further feedback
            try {
              backgroundRecognition.stop();
            } catch (error) {
              console.log('🎤 Background recognition stop error:', error);
            }
          } else if (detectedText.length > 0) {
            console.log('🎤 Ignoring potential AI voice feedback:', detectedText.trim());
          }
        }
      };
      
      backgroundRecognition.onerror = (event: any) => {
        console.error('🎤 Background speech recognition error:', event.error);
        setIsBackgroundListening(false);
      };
      
      backgroundRecognition.onend = () => {
        setIsBackgroundListening(false);
        console.log('🎤 Background voice detection ended');
      };
      
      backgroundRecognitionRef.current = backgroundRecognition;
    }
  }, [isAIResponding, onInterrupt]);

  // Enhanced speech recognition isolation with better timing
  useEffect(() => {
    if (isAIResponding) {
      // AI is speaking - IMMEDIATELY stop main recognition to prevent feedback loops
      if (recognitionRef.current && isListening) {
        console.log('🎤 AI responding - IMMEDIATELY stopping main speech recognition to prevent feedback');
        try {
          recognitionRef.current.abort(); // Use abort() for immediate stop
          setIsListening(false);
        } catch (error) {
          console.log('🎤 Error stopping main recognition:', error);
        }
      }
      
      // Delay background detection to allow audio to start playing first
      const startBackgroundTimer = setTimeout(() => {
        if (backgroundRecognitionRef.current && !isBackgroundListening && isAIResponding) {
          try {
            backgroundRecognitionRef.current.start();
            console.log('🎤 Starting delayed background voice detection for interruption');
          } catch (error) {
            console.log('🎤 Background recognition already running or error:', error);
          }
        }
      }, 1500); // Wait 1.5 seconds for audio to start playing
      
      return () => clearTimeout(startBackgroundTimer);
    } else {
      // AI finished responding - clean up background detection
      if (backgroundRecognitionRef.current && isBackgroundListening) {
        try {
          backgroundRecognitionRef.current.stop();
          console.log('🎤 AI finished - stopping background voice detection');
        } catch (error) {
          console.log('🎤 Error stopping background recognition:', error);
        }
      }
      
      // Reset to normal state - main recognition can be used again
      console.log('🎤 AI finished responding - voice input available again');
    }
  }, [isAIResponding, isListening, isBackgroundListening]);

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
    if (isAIResponding) {
      console.log('🎤 Interrupting AI to start voice input');
      onInterrupt(); // Interrupt the AI immediately
      
      // Wait a moment then start voice input
      setTimeout(() => {
        if (recognitionRef.current && !isListening) {
          setVoiceTranscript("");
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.log('🎤 Voice start error:', error);
          }
        }
      }, 200);
      return;
    }
    
    if (recognitionRef.current && !isListening) {
      setVoiceTranscript("");
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.log('🎤 Voice start error:', error);
      }
    }
  }, [isListening, isAIResponding, onInterrupt]);

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
          
          {(orbState === 'responding' || isAIResponding) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('🛑 Manual interrupt button clicked');
                onInterrupt();
                // Force restart voice input after interrupt
                setTimeout(() => {
                  if (inputMode === 'voice' && recognitionRef.current && !isListening) {
                    try {
                      recognitionRef.current.start();
                      console.log('🎤 Restarting voice input after interrupt');
                    } catch (error) {
                      console.log('🎤 Error restarting voice:', error);
                    }
                  }
                }, 500);
              }}
              className="text-red-600 hover:text-red-700 border-red-300 h-8 px-3 text-xs animate-pulse"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop AI
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {orbState === 'idle' && !isAIResponding && 'Ready'}
            {orbState === 'idle' && isAIResponding && '🔊 AI Speaking'}
            {orbState === 'listening' && 'Listening...'}
            {orbState === 'processing' && 'Processing...'}
            {orbState === 'responding' && '🔊 AI Speaking'}
            {orbState === 'interrupted' && 'Stopped'}
          </span>
          {isBackgroundListening && isAIResponding && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-amber-600">Interrupt Ready</span>
            </div>
          )}
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
                  {isAIResponding 
                    ? '🤐 Voice input paused while AI is speaking...' 
                    : isListening 
                      ? 'Speak now...' 
                      : 'Click microphone to start'
                  }
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <Button
                variant={isListening ? "destructive" : "default"}
                size="sm"
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                disabled={disabled || isProcessing || isAIResponding}
                className="flex items-center gap-1 h-8 px-3 text-xs"
                title={isAIResponding ? "Voice input disabled while AI is responding" : undefined}
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
                  disabled={disabled || isProcessing || isAIResponding}
                  className="flex items-center gap-1 h-8 px-3 text-xs"
                  title={isAIResponding ? "Cannot send while AI is responding" : undefined}
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