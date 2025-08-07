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
      // Transcript updates will trigger re-render automatically via currentTranscript state
    },
    onAutoSend: (text) => {
      console.log('🚀 VOICE AUTO-SEND RECEIVED:', text);
      console.log('🚀 Calling onSendMessage with:', text);
      
      // Clear text message immediately
      setTextMessage('');
      
      // Send the message to chat
      onSendMessage(text);
      
      console.log('✅ Voice message sent to chat successfully');
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
  
  // Debug logs after state is initialized
  console.log('🔄 EnhancedVoiceInterface rendered', { disabled, isStreaming, inputMode, isListening, currentTranscript });
  console.log('🐛 DEBUG - Component state:', { inputMode, isListening, voiceState, disabled, isSupported, hasPermission });

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
  const handleMicClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🔥 ===== MICROPHONE BUTTON CLICKED ===== ');
    console.log('🎤 Current state BEFORE:', { 
      inputMode, 
      isListening, 
      isSupported, 
      hasPermission,
      voiceState,
      disabled,
      currentTranscript: currentTranscript || '(empty)'
    });
    
    // Check if voice is supported first
    if (!isSupported) {
      console.error('❌ Speech recognition not supported in this browser');
      return;
    }
    
    // Force switch to voice mode if needed
    if (inputMode === 'text') {
      console.log('🔄 Switching from text to voice mode...');
      setInputMode('voice');
      setTextMessage('');
      // Give a moment for the mode switch
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Handle toggle
    try {
      if (isListening) {
        console.log('🛑 Currently listening - STOPPING...');
        stopListening();
      } else {
        console.log('🚀 NOT listening - STARTING now...');
        console.log('🚀 About to call startListening()...');
        
        const result = await startListening();
        
        console.log('🎤 Start listening RESULT:', result);
        console.log('🎤 State AFTER startListening:', { isListening, voiceState, currentTranscript: currentTranscript || '(empty)' });
        
        if (!result) {
          console.error('❌ ❌ FAILED to start listening - check permissions');
        } else {
          console.log('✅ ✅ SUCCESS - Speech recognition started!');
        }
      }
      
      console.log('🔥 ===== FINAL STATE AFTER TOGGLE ===== ');
      console.log({ isListening, voiceState, currentTranscript: currentTranscript || '(empty)' });
    } catch (error) {
      console.error('❌ ❌ CRITICAL ERROR in microphone click handler:', error);
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
        
        {/* Voice Mode Interface - DEBUG: inputMode is', inputMode */}
        {inputMode === 'voice' && (
          <div className="p-3">
            {/* Voice Input Field - looks like search bar */}
            <div className="flex items-center gap-2 mb-3">
              {/* Microphone Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={(e) => {
                      console.log('🔥 BUTTON CLICKED - TEST LOG!');
                      handleMicClick(e);
                    }}
                    disabled={disabled}
                    type="button"
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all duration-300 relative",
                      "hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0",
                      "flex items-center justify-center",
                      (isListening || currentTranscript || voiceState === 'listening')
                        ? "bg-teal-500 hover:bg-teal-600 border-teal-400 text-white shadow-lg shadow-teal-300/50 animate-pulse ring-2 ring-teal-300"
                        : "bg-white hover:bg-teal-50 border-teal-200 text-teal-600 hover:border-teal-300",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Mic className={cn("w-4 h-4", (isListening || currentTranscript || voiceState === 'listening') ? "text-white" : "text-teal-600")} />
                    
                    {/* Status indicator dot when active */}
                    {(isListening || currentTranscript || voiceState === 'listening') && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isListening ? "🔴 Listening - Click to stop" : "🎤 Click to start voice input"}
                </TooltipContent>
              </Tooltip>
              
              {/* Voice Input Display - REAL-TIME TRANSCRIPT */}
              <div className="flex-1 relative">
                <Input
                  key={`voice-input-${currentTranscript || 'empty'}`}
                  value={currentTranscript || ''}
                  placeholder={
                    isListening ? "🎤 Listening... speak now" : 
                    currentTranscript ? "Voice input detected" :
                    "Click microphone to speak"
                  }
                  readOnly
                  className={cn(
                    "border-0 focus-visible:ring-0 text-gray-800 font-medium transition-all duration-200",
                    "min-h-[40px] resize-none select-none",
                    (isListening || currentTranscript)
                      ? "bg-teal-50 placeholder-teal-600 ring-2 ring-teal-200 shadow-sm animate-pulse" 
                      : "bg-gray-50 placeholder-gray-500"
                  )}
                />
                
                {/* Debug overlay to show transcript value */}
                {currentTranscript && (
                  <div className="absolute -bottom-6 left-0 text-xs text-teal-600 font-mono">
                    "{currentTranscript}" ({currentTranscript.length} chars)
                  </div>
                )}
                
                {/* Status indicator */}
                {(isListening || currentTranscript || voiceState === 'listening') && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                    {confidence > 0 && (
                      <span className="text-xs text-teal-600 font-medium">
                        {Math.round(confidence * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
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
              
              {/* Status Text */}
              {(isListening || currentTranscript || voiceState === 'listening') && (
                <span className="text-xs text-teal-600 font-medium">
                  {currentTranscript ? 'Speech detected!' : 'Listening for your voice...'}
                </span>
              )}
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