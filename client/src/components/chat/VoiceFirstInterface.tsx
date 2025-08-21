import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GrokStyleOrb } from "./GrokStyleOrb";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Square, Send, Keyboard } from "lucide-react";
import { useVoiceModeHandler, VoiceState } from "./VoiceModeHandler";

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
  const [textInput, setTextInput] = useState("");
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'interrupted'>('idle');

  // Use the simplified voice handler
  const {
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
    interruptAI
  } = useVoiceModeHandler({
    onTranscript: (text, isInterim) => {
      console.log('📝 Voice transcript:', { text, isInterim });
    },
    onAutoSend: (text) => {
      console.log('🚀 Auto-sending message:', text);
      onSubmit(text);
    },
    onStateChange: (state: VoiceState) => {
      console.log('🎤 Voice state changed:', state);
    },
    onInterrupt: () => {
      console.log('🛑 Voice interrupted AI');
      onInterrupt();
    },
    disabled,
    isAIResponding,
    autoSendDelay: 1500,
    confidenceThreshold: 0.8
  });

  // Update orb state based on voice and app state
  useEffect(() => {
    if (isInterrupted) {
      setOrbState('interrupted');
    } else if (isStreaming) {
      setOrbState('responding');
    } else if (voiceState === 'processing') {
      setOrbState('processing');
    } else if (isListening) {
      setOrbState('listening');
    } else {
      setOrbState('idle');
    }
  }, [isListening, voiceState, isStreaming, isInterrupted]);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      setOrbState('processing');

      setTimeout(() => {
        onSubmit(textInput.trim());
        setTextInput("");
        setOrbState('idle');
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
      stopListening();
    }
    setInputMode(prev => prev === 'voice' ? 'text' : 'voice');
    setTextInput("");
  };

  const handleVoiceToggle = async () => {
    console.log('🎤 Voice toggle clicked');
    await toggleListening();
  };

  const handleManualInterrupt = () => {
    console.log('🛑 Manual interrupt clicked');
    onInterrupt();
    interruptAI();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header with Orb and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GrokStyleOrb state={orbState} size="sm" />
          <Button
            variant={inputMode === 'voice' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleInputMode}
            className="flex items-center gap-1 h-8 px-3 text-xs"
            disabled={!isSupported}
          >
            {inputMode === 'voice' ? <Mic className="h-3 w-3" /> : <Keyboard className="h-3 w-3" />}
            {inputMode === 'voice' ? 'Voice' : 'Text'}
          </Button>

          {(orbState === 'responding' || isAIResponding) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualInterrupt}
              className="text-red-600 hover:text-red-700 border-red-300 h-8 px-3 text-xs animate-pulse"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop AI
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {orbState === 'idle' && !isAIResponding && inputMode === 'voice' && 'Voice Ready'}
            {orbState === 'idle' && !isAIResponding && inputMode === 'text' && 'Text Ready'}
            {orbState === 'listening' && 'Listening...'}
            {orbState === 'processing' && 'Processing...'}
            {orbState === 'responding' && '🔊 AI Speaking'}
            {orbState === 'interrupted' && 'Voice Ready'}
          </span>
        </div>
      </div>

      {/* Voice Input Mode */}
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
              {currentTranscript ? (
                <p className="text-sm text-gray-900">{currentTranscript}</p>
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
                onClick={handleVoiceToggle}
                disabled={disabled}
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

              {confidence > 0 && (
                <span className="text-xs text-teal-600">
                  Confidence: {Math.round(confidence * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Simple Voice Waveform */}
          {isListening && (
            <div className="flex items-center justify-center gap-1 py-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-teal-500 rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 150}ms`,
                    height: `${4 + (audioLevel * 6)}px`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Text Input Mode */}
      {inputMode === 'text' && (
        <div className="space-y-1">
          <div className="relative">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[60px] pr-12 resize-none text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || disabled}
              className="absolute bottom-2 right-2 h-7 w-7 p-0"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Support Notice */}
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