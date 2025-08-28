import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Square, Settings, Volume2, VolumeX } from 'lucide-react';
import { useUnifiedVoiceHandler, type VoiceState, type UnifiedVoiceHandlerProps } from './UnifiedVoiceHandler';
import { GrokStyleOrb } from './GrokStyleOrb';
import { AudioWaveform } from './AudioWaveform';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ScholarPersona } from './ScholarPersonas';

// Map internal voice states to orb states
function mapVoiceStateToOrb(state: VoiceState, isInterrupted: boolean): 'idle' | 'listening' | 'processing' | 'responding' | 'interrupted' {
  if (isInterrupted) return 'interrupted';
  
  switch (state) {
    case 'IDLE': return 'idle';
    case 'LISTENING': return 'listening';
    case 'PROCESSING': return 'processing';
    case 'SPEAKING': return 'responding';
    default: return 'idle';
  }
}

export interface UnifiedVoiceInterfaceProps {
  onSendMessage: (message: string) => void;
  onInterrupt: () => void;
  selectedPersona?: ScholarPersona | null;
  isAIResponding?: boolean;
  disabled?: boolean;
  className?: string;
}

export function UnifiedVoiceInterface({
  onSendMessage,
  onInterrupt,
  selectedPersona,
  isAIResponding = false,
  disabled = false,
  className = ""
}: UnifiedVoiceInterfaceProps) {
  // Voice settings
  const [settings, setSettings] = useState({
    autoSendDelay: 1500,
    confidenceThreshold: 0.85,
    interruptionSensitivity: 0.3,
    volume: 0.8,
    autoPlay: true
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [lastInterruptedText, setLastInterruptedText] = useState('');
  const currentResponseRef = useRef('');
  
  // Use unified voice handler
  const {
    voiceState,
    startListening,
    stopListening,
    toggleListening,
    playText,
    stopPlayback,
    interruptAI,
    setVolume
  } = useUnifiedVoiceHandler({
    onTranscript: (text, isInterim) => {
      console.log('📝 Voice transcript:', { text, isInterim, confidence: voiceState.confidence });
    },
    onAutoSend: (text) => {
      console.log('🚀 Auto-sending message:', text);
      onSendMessage(text);
    },
    onInterrupt: () => {
      console.log('🛑 Voice interrupted AI');
      
      // Store interrupted context for potential continuation
      if (currentResponseRef.current) {
        setLastInterruptedText(currentResponseRef.current);
        console.log('💾 Stored interrupted context:', currentResponseRef.current.substring(0, 50) + '...');
      }
      
      onInterrupt();
    },
    onPlaybackStart: () => {
      console.log('🔊 AI voice playback started');
    },
    onPlaybackEnd: () => {
      console.log('🔊 AI voice playback finished');
      currentResponseRef.current = '';
    },
    selectedPersona,
    disabled,
    autoSendDelay: settings.autoSendDelay,
    confidenceThreshold: settings.confidenceThreshold,
    interruptionSensitivity: settings.interruptionSensitivity,
    volume: settings.volume
  });
  
  // Handle AI response playback
  const handlePlayAIResponse = async (text: string) => {
    if (!text || !settings.autoPlay) return;
    
    currentResponseRef.current = text;
    console.log('🎙️ Playing AI response with unified handler:', text.substring(0, 50) + '...');
    
    try {
      await playText(text);
    } catch (error) {
      console.error('🚨 Failed to play AI response:', error);
    }
  };
  
  // Handle manual interruption
  const handleManualInterrupt = () => {
    if (voiceState.state === 'SPEAKING') {
      console.log('🚨 Manual interruption triggered');
      interruptAI();
    } else {
      stopListening();
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setSettings(prev => ({ ...prev, volume: newVolume }));
    setVolume(newVolume);
  };
  
  // Get status message
  const getStatusMessage = (): string => {
    if (!voiceState.isSupported) return 'Voice not supported';
    if (!voiceState.hasPermission) return 'Microphone access needed';
    if (voiceState.error) return voiceState.error;
    if (voiceState.isInterrupted) return 'Interrupted - Continue speaking';
    
    switch (voiceState.state) {
      case 'LISTENING': return 'Listening...';
      case 'PROCESSING': return 'Processing...';
      case 'SPEAKING': return 'AI speaking (speak to interrupt)';
      default: return 'Ready';
    }
  };
  
  // Get status color
  const getStatusColor = (): string => {
    if (voiceState.error) return 'text-red-500';
    if (voiceState.isInterrupted) return 'text-red-400';
    
    switch (voiceState.state) {
      case 'LISTENING': return 'text-teal-500';
      case 'PROCESSING': return 'text-purple-500';
      case 'SPEAKING': return 'text-amber-500';
      default: return 'text-gray-500';
    }
  };
  
  const orbState = mapVoiceStateToOrb(voiceState.state, voiceState.isInterrupted);
  const isActive = voiceState.state !== 'IDLE';
  
  return (
    <div className={cn("flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border rounded-lg shadow-sm", className)}>
      {/* Main Orb */}
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <GrokStyleOrb 
                state={orbState} 
                size="lg" 
                className="cursor-pointer transition-transform hover:scale-110" 
              />
              {voiceState.isInterrupted && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{voiceState.isInterrupted ? 'Interrupted' : getStatusMessage()}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Audio Waveform */}
      {voiceState.state === 'LISTENING' && (
        <AudioWaveform 
          isActive={true}
          audioLevel={voiceState.audioLevel}
          size="md"
          color="teal"
          className="flex-1"
        />
      )}
      
      {/* Status and Transcript */}
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", getStatusColor())}>
          {getStatusMessage()}
        </div>
        
        {voiceState.transcript && (
          <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
            "{voiceState.transcript}"
          </div>
        )}
        
        {voiceState.confidence > 0 && (
          <Badge variant="secondary" className="text-xs mt-1">
            {Math.round(voiceState.confidence * 100)}% confident
          </Badge>
        )}
        
        {lastInterruptedText && voiceState.isInterrupted && (
          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            💬 Context: "{lastInterruptedText.substring(0, 50)}..."
          </div>
        )}
      </div>
      
      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {/* Primary Voice Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={voiceState.state === 'LISTENING' ? 'default' : 'outline'}
              size="sm"
              onClick={toggleListening}
              disabled={disabled || !voiceState.isSupported || !voiceState.hasPermission}
              className={cn(
                "transition-all duration-200",
                voiceState.state === 'LISTENING' && "bg-teal-500 hover:bg-teal-600 text-white",
                voiceState.state === 'SPEAKING' && "bg-amber-500 hover:bg-amber-600 text-white"
              )}
            >
              {voiceState.state === 'LISTENING' ? (
                <MicOff className="h-4 w-4" />
              ) : voiceState.state === 'SPEAKING' ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {voiceState.state === 'LISTENING' 
                ? 'Stop listening' 
                : voiceState.state === 'SPEAKING'
                ? 'Interrupt AI'
                : 'Start listening'
              }
            </p>
          </TooltipContent>
        </Tooltip>
        
        {/* Interrupt Button (during AI speech) */}
        {voiceState.state === 'SPEAKING' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleManualInterrupt}
                className="animate-pulse"
              >
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Interrupt AI (Grok-style)</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Resume Button (after interruption) */}
        {voiceState.isInterrupted && lastInterruptedText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePlayAIResponse(lastInterruptedText)}
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                Resume
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Resume interrupted response</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Settings */}
        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Voice Settings</h4>
              
              {/* Auto-send Delay */}
              <div className="space-y-2">
                <Label className="text-sm">Auto-send Delay: {settings.autoSendDelay}ms</Label>
                <Slider
                  value={[settings.autoSendDelay]}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, autoSendDelay: value[0] }))}
                  max={3000}
                  min={500}
                  step={100}
                  className="w-full"
                />
              </div>
              
              {/* Confidence Threshold */}
              <div className="space-y-2">
                <Label className="text-sm">Confidence: {Math.round(settings.confidenceThreshold * 100)}%</Label>
                <Slider
                  value={[settings.confidenceThreshold]}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, confidenceThreshold: value[0] }))}
                  max={1}
                  min={0.3}
                  step={0.05}
                  className="w-full"
                />
              </div>
              
              {/* Volume */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Volume2 className="h-3 w-3" />
                  Volume: {Math.round(settings.volume * 100)}%
                </Label>
                <Slider
                  value={[settings.volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
              
              {/* Interruption Sensitivity */}
              <div className="space-y-2">
                <Label className="text-sm">Interruption Sensitivity: {Math.round(settings.interruptionSensitivity * 100)}%</Label>
                <Slider
                  value={[settings.interruptionSensitivity]}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, interruptionSensitivity: value[0] }))}
                  max={1}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
              </div>
              
              {/* Auto-play Toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Auto-play AI responses</Label>
                <Switch
                  checked={settings.autoPlay}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoPlay: checked }))}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// Export the voice interface component only
// Playback functionality is handled internally through the component