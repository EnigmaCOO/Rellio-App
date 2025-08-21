
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Mic, 
  MicOff, 
  Square, 
  Send, 
  Settings, 
  Keyboard,
  Volume2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'sending' | 'interrupted' | 'error';

interface SupremeVoiceInterfaceProps {
  onSubmit: (message: string) => void;
  onInterrupt?: () => void;
  isStreaming?: boolean;
  isAIResponding?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function SupremeVoiceInterface({
  onSubmit,
  onInterrupt,
  isStreaming = false,
  isAIResponding = false,
  disabled = false,
  placeholder = "Speak or type your question...",
  className = ""
}: SupremeVoiceInterfaceProps) {
  
  // Core State
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Voice Settings
  const [autoSend, setAutoSend] = useState(true);
  const [autoSendDelay, setAutoSendDelay] = useState(1500);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [language, setLanguage] = useState('en-US');
  
  // Browser Support
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize browser support and permissions
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false));
    }
  }, []);

  // Audio level monitoring
  const startAudioLevelMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average / 255);
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Failed to start audio monitoring:', error);
    }
  }, []);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
  }, []);

  // Clear auto-send timer
  const clearAutoSendTimer = useCallback(() => {
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
  }, []);

  // Auto-send functionality
  const scheduleAutoSend = useCallback((text: string, confidence: number) => {
    if (!autoSend || confidence < confidenceThreshold) return;
    
    clearAutoSendTimer();
    
    autoSendTimerRef.current = setTimeout(() => {
      console.log('🚀 Auto-sending:', text);
      setVoiceState('sending');
      onSubmit(text);
      setTranscript('');
      setTimeout(() => {
        if (voiceState !== 'listening') {
          setVoiceState('idle');
        }
      }, 500);
    }, autoSendDelay);
  }, [autoSend, confidenceThreshold, autoSendDelay, onSubmit, clearAutoSendTimer, voiceState]);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!isSupported) return null;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setVoiceState('listening');
      startAudioLevelMonitoring();
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let bestConfidence = 0;
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const resultText = result[0].transcript.trim();
        const resultConfidence = result[0].confidence || 0.8;
        
        if (result.isFinal) {
          finalTranscript += resultText + ' ';
          bestConfidence = Math.max(bestConfidence, resultConfidence);
        } else {
          interimTranscript += resultText + ' ';
        }
      }
      
      const fullTranscript = (finalTranscript + interimTranscript).trim();
      setTranscript(fullTranscript);
      setConfidence(bestConfidence);
      
      // Schedule auto-send for final results
      if (finalTranscript.trim()) {
        scheduleAutoSend(finalTranscript.trim(), bestConfidence);
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('🎤 Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setVoiceState('error');
        setTimeout(() => setVoiceState('idle'), 2000);
      }
    };
    
    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      stopAudioLevelMonitoring();
      if (voiceState === 'listening') {
        setVoiceState('idle');
      }
    };
    
    return recognition;
  }, [isSupported, language, startAudioLevelMonitoring, stopAudioLevelMonitoring, scheduleAutoSend, voiceState]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isSupported || disabled || voiceState === 'listening') return false;
    
    try {
      // Cleanup existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      
      // Clear previous state
      setTranscript('');
      setConfidence(0);
      clearAutoSendTimer();
      
      // Initialize new recognition
      recognitionRef.current = initializeSpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.start();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to start listening:', error);
      setVoiceState('error');
      setTimeout(() => setVoiceState('idle'), 2000);
      return false;
    }
  }, [isSupported, disabled, voiceState, initializeSpeechRecognition, clearAutoSendTimer]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    stopAudioLevelMonitoring();
    clearAutoSendTimer();
    setVoiceState('idle');
  }, [stopAudioLevelMonitoring, clearAutoSendTimer]);

  // Toggle listening
  const toggleListening = useCallback(async () => {
    if (voiceState === 'listening') {
      stopListening();
    } else {
      await startListening();
    }
  }, [voiceState, startListening, stopListening]);

  // Manual send
  const handleManualSend = useCallback(() => {
    if (inputMode === 'voice' && transcript.trim()) {
      setVoiceState('sending');
      onSubmit(transcript.trim());
      setTranscript('');
      stopListening();
      setTimeout(() => setVoiceState('idle'), 500);
    } else if (inputMode === 'text' && textInput.trim()) {
      setVoiceState('sending');
      onSubmit(textInput.trim());
      setTextInput('');
      setTimeout(() => setVoiceState('idle'), 500);
    }
  }, [inputMode, transcript, textInput, onSubmit, stopListening]);

  // Handle interruption
  const handleInterrupt = useCallback(() => {
    setVoiceState('interrupted');
    onInterrupt?.();
    stopListening();
    setTimeout(() => setVoiceState('idle'), 1000);
  }, [onInterrupt, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopAudioLevelMonitoring();
      clearAutoSendTimer();
    };
  }, [stopListening, stopAudioLevelMonitoring, clearAutoSendTimer]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleManualSend();
    }
  }, [handleManualSend]);

  // Orb colors based on state
  const getOrbStyle = () => {
    switch (voiceState) {
      case 'listening':
        return 'bg-gradient-to-br from-teal-400 to-cyan-500 animate-pulse shadow-lg shadow-teal-500/50';
      case 'processing':
        return 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-spin shadow-lg shadow-yellow-500/50';
      case 'sending':
        return 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50';
      case 'interrupted':
        return 'bg-gradient-to-br from-red-400 to-rose-500 animate-pulse shadow-lg shadow-red-500/50';
      case 'error':
        return 'bg-gradient-to-br from-red-500 to-pink-600 shadow-lg shadow-red-500/50';
      default:
        return 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/30';
    }
  };

  // Audio visualization bars
  const AudioBars = () => (
    <div className="flex items-center justify-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-white rounded-full transition-all duration-150"
          style={{
            height: `${4 + (audioLevel * 12) + Math.sin(Date.now() / 200 + i) * 2}px`,
            opacity: voiceState === 'listening' ? 0.8 + audioLevel * 0.2 : 0.3
          }}
        />
      ))}
    </div>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with mode toggle and settings */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Input Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={inputMode === 'voice' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInputMode('voice')}
              disabled={!isSupported}
              className="h-7 px-3 text-xs"
            >
              <Mic className="h-3 w-3 mr-1" />
              Voice
            </Button>
            <Button
              variant={inputMode === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInputMode('text')}
              className="h-7 px-3 text-xs"
            >
              <Keyboard className="h-3 w-3 mr-1" />
              Text
            </Button>
          </div>

          {/* Status Badge */}
          <Badge 
            variant={voiceState === 'idle' ? 'secondary' : 'default'}
            className={cn(
              "text-xs transition-all duration-300",
              voiceState === 'listening' && "bg-teal-100 text-teal-800",
              voiceState === 'processing' && "bg-yellow-100 text-yellow-800",
              voiceState === 'sending' && "bg-green-100 text-green-800",
              voiceState === 'error' && "bg-red-100 text-red-800"
            )}
          >
            {voiceState === 'idle' && 'Ready'}
            {voiceState === 'listening' && 'Listening'}
            {voiceState === 'processing' && 'Processing'}
            {voiceState === 'sending' && 'Sending'}
            {voiceState === 'interrupted' && 'Interrupted'}
            {voiceState === 'error' && 'Error'}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* Interrupt Button */}
          {(isStreaming || isAIResponding) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInterrupt}
              className="h-7 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop AI
            </Button>
          )}

          {/* Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Voice Settings</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Auto-send</label>
                    <Switch
                      checked={autoSend}
                      onCheckedChange={setAutoSend}
                    />
                  </div>
                  
                  {autoSend && (
                    <div className="space-y-1">
                      <label className="text-xs text-gray-600">
                        Delay: {autoSendDelay}ms
                      </label>
                      <Slider
                        value={[autoSendDelay]}
                        onValueChange={(value) => setAutoSendDelay(value[0])}
                        min={500}
                        max={3000}
                        step={100}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">
                      Confidence: {Math.round(confidenceThreshold * 100)}%
                    </label>
                    <Slider
                      value={[confidenceThreshold]}
                      onValueChange={(value) => setConfidenceThreshold(value[0])}
                      min={0.5}
                      max={1}
                      step={0.05}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Main Interface */}
      <div className="relative">
        {inputMode === 'voice' ? (
          /* Voice Mode */
          <div className="space-y-3">
            {/* Voice Input Area */}
            <div className={cn(
              "relative p-4 rounded-lg border-2 transition-all duration-300",
              voiceState === 'listening' 
                ? "border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50" 
                : "border-gray-200 bg-gray-50"
            )}>
              {/* Main Voice Button (Orb) */}
              <div className="flex items-center justify-center mb-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={toggleListening}
                      disabled={disabled}
                      className={cn(
                        "w-16 h-16 rounded-full border-2 border-white/20 transition-all duration-300",
                        "hover:scale-105 active:scale-95 relative overflow-hidden",
                        getOrbStyle()
                      )}
                    >
                      {voiceState === 'listening' ? (
                        <AudioBars />
                      ) : voiceState === 'error' ? (
                        <AlertCircle className="h-6 w-6 text-white" />
                      ) : voiceState === 'sending' ? (
                        <CheckCircle className="h-6 w-6 text-white" />
                      ) : (
                        <Mic className="h-6 w-6 text-white" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {voiceState === 'listening' ? 'Stop listening' : 'Start listening'}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Transcript Display */}
              <div className="min-h-[40px] flex items-center justify-center">
                {transcript ? (
                  <p className="text-sm text-center text-gray-900 leading-relaxed">
                    {transcript}
                  </p>
                ) : (
                  <p className="text-xs text-center text-gray-500 italic">
                    {voiceState === 'listening' ? 'Listening...' : 'Click the orb to start speaking'}
                  </p>
                )}
              </div>

              {/* Confidence and Controls */}
              {(confidence > 0 || transcript) && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    {confidence > 0 && (
                      <span>Confidence: {Math.round(confidence * 100)}%</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopListening}
                      disabled={voiceState !== 'listening'}
                      className="h-7 px-3 text-xs"
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Stop
                    </Button>
                    
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleManualSend}
                      disabled={!transcript.trim() || disabled}
                      className="h-7 px-3 text-xs"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Text Mode */
          <div className="relative">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[80px] pr-12 resize-none"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualSend}
              disabled={!textInput.trim() || disabled}
              className="absolute bottom-2 right-2 h-7 w-7 p-0"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Browser Support Warning */}
      {!isSupported && (
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-800">
            Voice input not supported in this browser. Use text mode instead.
          </p>
        </div>
      )}
    </div>
  );
}
