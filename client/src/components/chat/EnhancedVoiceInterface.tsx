import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Keyboard, Send, Settings, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useVoiceModeHandler, VoiceState } from './VoiceModeHandler';
import { AudioWaveform } from './AudioWaveform';
import { GrokStyleOrb } from './GrokStyleOrb';

interface EnhancedVoiceInterfaceProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onInterrupt?: () => void;
  placeholder?: string;
  className?: string;
}

type InputMode = 'voice' | 'text';

export function EnhancedVoiceInterface({
  onSendMessage,
  disabled = false,
  isStreaming = false,
  onInterrupt,
  placeholder = "Ask about this scripture...",
  className
}: EnhancedVoiceInterfaceProps) {
  // State management
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [textMessage, setTextMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showEchoWarning, setShowEchoWarning] = useState(false);
  const [settings, setSettings] = useState({
    autoSendDelay: 1.5,
    confidenceThreshold: 0.8,
    interruptionSensitivity: 0.3,
    voiceEnabled: true,
    echoWarningDismissed: false
  });

  const textInputRef = useRef<HTMLInputElement>(null);

  // Voice mode handler with all the advanced features
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
      // Show interim results in real-time
      console.log('📝 Transcript update:', { text, isInterim, inputMode, length: text.length });
      // Force re-render to show transcript updates
    },
    onAutoSend: (text) => {
      console.log('🚀 Auto-sending message:', text);
      onSendMessage(text);
      // Clear the text message after sending
      setTextMessage('');
    },
    onStateChange: (state: VoiceState) => {
      // Handle state changes for UI updates
      if (state === 'interrupted' && onInterrupt) {
        onInterrupt();
      }
    },
    onInterrupt: () => {
      if (onInterrupt) {
        onInterrupt();
      }
    },
    disabled,
    isAIResponding: isStreaming,
    autoSendDelay: settings.autoSendDelay * 1000,
    confidenceThreshold: settings.confidenceThreshold,
    interruptionSensitivity: settings.interruptionSensitivity
  });

  // Handle text mode send
  const handleTextSend = () => {
    if (textMessage.trim()) {
      onSendMessage(textMessage.trim());
      setTextMessage('');
    }
  };

  // Don't sync transcript to textMessage in voice mode - let it display via currentTranscript
  // This prevents interference between voice display and text input mode

  // Handle Enter key in text mode
  const handleTextKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSend();
    }
  };

  // Switch input modes
  const switchToVoiceMode = async () => {
    if (!isSupported) {
      console.warn('Speech recognition not supported');
      return;
    }
    if (!hasPermission) {
      console.warn('Microphone permission required');
      return;
    }
    setInputMode('voice');
    setTextMessage('');
  };

  const switchToTextMode = () => {
    setInputMode('text');
    stopListening();
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  // Handle microphone button click
  const handleMicClick = async () => {
    console.log('🎤 Mic button clicked', { inputMode, isListening, isSupported, hasPermission });
    
    if (inputMode === 'text') {
      await switchToVoiceMode();
      return;
    }

    if (isListening) {
      console.log('🛑 Stopping listening');
      stopListening();
    } else {
      console.log('▶️ Starting listening');
      
      // Check permissions first
      if (!isSupported) {
        console.error('Speech recognition not supported');
        return;
      }
      
      if (!hasPermission) {
        console.error('Microphone permission required');
        // Try to request permission
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
          console.error('Failed to get microphone permission:', error);
          setShowEchoWarning(true);
          return;
        }
      }
      
      const started = await startListening();
      console.log('🎤 Listening started:', started);
      if (!started && !settings.echoWarningDismissed) {
        setShowEchoWarning(true);
      }
    }
  };

  // Get the appropriate orb state for the current voice state
  const getOrbState = () => {
    if (disabled) return 'idle';
    
    switch (voiceState) {
      case 'listening': return 'listening';
      case 'processing': return 'processing';
      case 'speaking': return 'responding';
      case 'interrupted': return 'interrupted';
      default: return 'idle';
    }
  };

  // Echo cancellation warning
  const EchoWarning = () => (
    <div className="fixed top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <div className="flex items-start gap-3">
        <Headphones className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-yellow-800">Audio Feedback Detected</h4>
          <p className="text-xs text-yellow-700 mt-1">
            For best results, use headphones or lower your speaker volume to prevent echo.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                setShowEchoWarning(false);
                setSettings(s => ({ ...s, echoWarningDismissed: true }));
              }}
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Settings Panel
  const SettingsPanel = () => (
    <div className="space-y-4 p-4 min-w-[280px]">
      <div className="space-y-2">
        <label className="text-sm font-medium">Auto-send Delay</label>
        <div className="flex items-center gap-3">
          <Slider
            value={[settings.autoSendDelay]}
            onValueChange={([value]) => setSettings(s => ({ ...s, autoSendDelay: value }))}
            min={1}
            max={3}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs text-gray-500 w-8">{settings.autoSendDelay}s</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Confidence Threshold</label>
        <div className="flex items-center gap-3">
          <Slider
            value={[settings.confidenceThreshold]}
            onValueChange={([value]) => setSettings(s => ({ ...s, confidenceThreshold: value }))}
            min={0.5}
            max={1}
            step={0.05}
            className="flex-1"
          />
          <span className="text-xs text-gray-500 w-12">{Math.round(settings.confidenceThreshold * 100)}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Interruption Sensitivity</label>
        <div className="flex items-center gap-3">
          <Slider
            value={[settings.interruptionSensitivity]}
            onValueChange={([value]) => setSettings(s => ({ ...s, interruptionSensitivity: value }))}
            min={0.1}
            max={0.6}
            step={0.05}
            className="flex-1"
          />
          <span className="text-xs text-gray-500 w-12">{Math.round(settings.interruptionSensitivity * 100)}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <label className="text-sm font-medium">Voice Mode</label>
        <Switch
          checked={settings.voiceEnabled}
          onCheckedChange={(checked) => {
            setSettings(s => ({ ...s, voiceEnabled: checked }));
            if (!checked && isListening) {
              stopListening();
              switchToTextMode();
            }
          }}
        />
      </div>
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      {/* Echo Warning */}
      {showEchoWarning && <EchoWarning />}
      
      {/* Main Interface Container */}
      <div className="relative bg-white rounded-xl border-2 border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
        
        {/* Voice Mode Interface */}
        {inputMode === 'voice' && (
          <div className="p-4">
            {/* Voice Controls Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Main Microphone Button with Grok-style Orb */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleMicClick}
                      disabled={disabled || (!isSupported || !hasPermission)}
                      className={cn(
                        "relative w-12 h-12 rounded-full border-2 transition-all duration-300",
                        "hover:scale-105 active:scale-95",
                        isListening
                          ? "bg-teal-500 hover:bg-teal-600 border-teal-300 text-white shadow-lg shadow-teal-200 animate-pulse"
                          : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-600 hover:border-gray-400"
                      )}
                    >
                      <Mic className={cn("w-5 h-5", isListening ? "text-white" : "text-gray-600")} />
                      
                      {/* Orb overlay */}
                      <div className="absolute -top-1 -right-1">
                        <GrokStyleOrb state={getOrbState()} size="sm" />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isListening ? "Listening - speak now" : "Click to start voice input"}
                  </TooltipContent>
                </Tooltip>

                {/* Live Transcript Display - replaces status text */}
                <div className="flex-1 min-w-0">
                  {isListening ? (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-teal-700">Listening...</span>
                      </div>
                      <div className="text-sm text-gray-800 min-h-[20px] leading-relaxed">
                        {currentTranscript ? (
                          <span className="font-medium">{currentTranscript}</span>
                        ) : (
                          <span className="text-gray-500 italic">Speak now...</span>
                        )}
                      </div>
                      {confidence > 0 && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">
                            Confidence: {Math.round(confidence * 100)}%
                          </span>
                          {confidence > settings.confidenceThreshold && currentTranscript && (
                            <span className="text-xs text-green-600 font-medium">
                              Ready to send
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <span className="text-sm text-gray-600">Tap microphone to speak</span>
                      {currentTranscript && (
                        <p className="text-sm text-gray-800 mt-1 italic">
                          Last: "{currentTranscript}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={switchToTextMode}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Keyboard className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Switch to text input</TooltipContent>
                </Tooltip>

                <Popover open={showSettings} onOpenChange={setShowSettings}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="p-0">
                    <SettingsPanel />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Waveform Visualization */}
            {isListening && (
              <div className="mt-3">
                <AudioWaveform
                  isActive={isListening}
                  audioLevel={audioLevel}
                  size="md"
                  color="teal"
                  className="justify-center"
                />
              </div>
            )}
          </div>
        )}

        {/* Text Mode Interface */}
        {inputMode === 'text' && (
          <div className="flex items-center gap-2 p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={switchToVoiceMode}
              disabled={!isSupported || !hasPermission}
              className="text-gray-500 hover:text-teal-600"
            >
              <Mic className="w-4 h-4" />
            </Button>
            
            <Input
              ref={textInputRef}
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              onKeyPress={handleTextKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className="border-0 focus-visible:ring-0 bg-transparent"
            />
            
            <Button
              onClick={handleTextSend}
              disabled={disabled || !textMessage.trim()}
              size="sm"
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Interruption Handle for AI Responses */}
        {isStreaming && (
          <div className="absolute top-2 right-2">
            <Button
              onClick={interruptAI}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <MicOff className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Support Information */}
      {!isSupported && (
        <div className="mt-2 text-xs text-red-500 text-center">
          Voice input not supported in this browser
        </div>
      )}
      
      {isSupported && !hasPermission && (
        <div className="mt-2 text-xs text-yellow-600 text-center">
          Microphone access required for voice input
        </div>
      )}
    </div>
  );
}