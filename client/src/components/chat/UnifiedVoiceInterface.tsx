
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Square, Send, Keyboard, Volume2, VolumeX } from 'lucide-react';
import { useConsolidatedVoiceHandler, VoiceState } from './ConsolidatedVoiceHandler';
import { GrokStyleOrb } from './GrokStyleOrb';

interface UnifiedVoiceInterfaceProps {
  onSubmit: (message: string) => void;
  isStreaming: boolean;
  isInterrupted: boolean;
  onInterrupt: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  isAIResponding?: boolean;
  setAISpeaking?: (speaking: boolean) => void;
}

export function UnifiedVoiceInterface({
  onSubmit,
  isStreaming,
  isInterrupted,
  onInterrupt,
  placeholder = "Speak or type your spiritual question...",
  disabled = false,
  className = "",
  isAIResponding = false,
  setAISpeaking
}: UnifiedVoiceInterfaceProps) {
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState("");
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'interrupted'>('idle');

  // Use the consolidated voice handler
  const {
    isListening,
    currentTranscript,
    confidence,
    voiceState,
    audioLevel,
    startListening,
    stopListening,
    toggleListening,
    setAISpeaking: voiceSetAISpeaking,
    isSupported,
    hasPermission,
    interruptAI
  } = useConsolidatedVoiceHandler({
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

  // Sync external AI speaking state with voice handler
  useEffect(() => {
    if (setAISpeaking && voiceSetAISpeaking) {
      voiceSetAISpeaking(isAIResponding);
    }
  }, [isAIResponding, setAISpeaking, voiceSetAISpeaking]);

  // Update orb state based on voice and app state
  useEffect(() => {
    if (isInterrupted) {
      setOrbState('interrupted');
    } else if (isStreaming || isAIResponding) {
      setOrbState('responding');
    } else if (voiceState === 'processing') {
      setOrbState('processing');
    } else if (isListening) {
      setOrbState('listening');
    } else {
      setOrbState('idle');
    }
  }, [isListening, voiceState, isStreaming, isInterrupted, isAIResponding]);

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
    try {
      await toggleListening();
    } catch (error) {
      console.error('❌ Error in toggleListening:', error);
    }
  };

  const handleManualInterrupt = () => {
    console.log('🛑 Manual interrupt clicked');
    onInterrupt();
    interruptAI();
  };

  return (
    <div className={cn("space-y-3 p-4 bg-white rounded-xl shadow-md border border-gray-100", className)}>
      {/* Header with Orb and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GrokStyleOrb state={orbState} size="sm" />
          <Button
            variant={inputMode === 'voice' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleInputMode}
            className={cn(
              "flex items-center gap-2 h-9 px-4 text-sm rounded-xl transition-all duration-200",
              inputMode === 'voice' 
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md hover:shadow-lg" 
                : "border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50"
            )}
            disabled={!isSupported}
          >
            {inputMode === 'voice' ? <Mic className="h-4 w-4" /> : <Keyboard className="h-4 w-4" />}
            {inputMode === 'voice' ? 'Voice' : 'Text'}
          </Button>

          {(orbState === 'responding' || isAIResponding) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualInterrupt}
              className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 h-9 px-4 text-sm rounded-xl animate-pulse transition-all duration-200"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop AI
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            {isSupported ? (
              <div className="flex items-center gap-1">
                <Volume2 className="h-3 w-3 text-teal-500" />
                <span className="text-xs">
                  {orbState === 'idle' && !isAIResponding && inputMode === 'voice' && 'Voice Ready'}
                  {orbState === 'idle' && !isAIResponding && inputMode === 'text' && 'Text Ready'}
                  {orbState === 'listening' && 'Listening...'}
                  {orbState === 'processing' && 'Processing...'}
                  {orbState === 'responding' && '🔊 AI Speaking'}
                  {orbState === 'interrupted' && 'Voice Ready'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <VolumeX className="h-3 w-3 text-gray-400" />
                <span className="text-xs">Voice Not Supported</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Input Mode */}
      {inputMode === 'voice' && (
        <div className="space-y-3">
          <div className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-300",
            isListening 
              ? "border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md" 
              : "border-gray-200 bg-gray-50 hover:border-gray-300"
          )}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                {isListening ? 'Listening...' : 'Voice Input'}
              </span>
              {isListening && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-red-600 font-medium">Recording</span>
                </div>
              )}
            </div>

            <div className="min-h-[50px] flex items-center">
              {currentTranscript ? (
                <p className="text-sm text-gray-900 leading-relaxed">{currentTranscript}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  {isListening ? 'Speak now...' : 'Click microphone to start'}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <Button
                variant={isListening ? "destructive" : "default"}
                size="sm"
                onClick={handleVoiceToggle}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-2 h-9 px-4 text-sm rounded-xl transition-all duration-200",
                  isListening 
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-md" 
                    : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-md hover:shadow-lg"
                )}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Speak
                  </>
                )}
              </Button>

              {confidence > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-teal-600 font-medium">
                    Confidence: {Math.round(confidence * 100)}%
                  </span>
                  <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-300"
                      style={{ width: `${confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Audio Waveform */}
          {isListening && (
            <div className="flex items-center justify-center gap-1 py-2">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-teal-400 to-cyan-400 rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 150}ms`,
                    height: `${8 + (audioLevel * 12)}px`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Text Input Mode */}
      {inputMode === 'text' && (
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[80px] pr-14 resize-none text-sm rounded-xl border-2 border-gray-200 focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all duration-200"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || disabled}
              className={cn(
                "absolute bottom-3 right-3 h-8 w-8 p-0 rounded-lg transition-all duration-200",
                textInput.trim() 
                  ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-md" 
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Support Notice */}
      {!isSupported && (
        <div className="text-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
          <p className="text-sm text-yellow-800">
            Voice input not supported in this browser. Use text mode instead.
          </p>
        </div>
      )}

      {/* Permission Notice */}
      {isSupported && !hasPermission && (
        <div className="text-center p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
          <p className="text-sm text-red-800">
            Microphone permission required for voice input.
          </p>
        </div>
      )}
    </div>
  );
}
