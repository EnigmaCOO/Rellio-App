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
  const [audioLevel, setAudioLevel] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        setIsExpanded(true);
        console.log('🎤 Voice-first mode activated');
        startAudioAnalysis();
        startWaveformAnimation();
      };
      
      recognitionInstance.onend = () => {
        if (mode === 'listening') {
          setMode('idle');
          setIsExpanded(false);
          stopWaveformAnimation();
          stopAudioAnalysis();
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
      stopAudioAnalysis();
    };
  }, [selectedLanguage, mode, transcript]);

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyser && mode === 'listening') {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedLevel = Math.min(average / 128, 1);
          setAudioLevel(normalizedLevel);
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone access failed",
        description: "Please allow microphone permissions for voice input",
        variant: "destructive",
      });
    }
  };

  const stopAudioAnalysis = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const startWaveformAnimation = () => {
    const animate = () => {
      if (waveformRef.current && mode === 'listening') {
        const waves = waveformRef.current.children;
        for (let i = 0; i < waves.length; i++) {
          const wave = waves[i] as HTMLElement;
          // Use actual audio level for more dynamic animation
          const baseHeight = 8;
          const amplitude = audioLevel * 30;
          const variation = Math.sin(Date.now() * 0.01 + i * 0.5) * 5;
          const height = baseHeight + amplitude + variation;
          wave.style.height = `${Math.max(height, 4)}px`;
          
          // Add lotus-like formation during pauses (low audio)
          if (audioLevel < 0.1) {
            const lotusHeight = 8 + Math.sin(Date.now() * 0.003 + i * 1.2) * 3;
            wave.style.height = `${lotusHeight}px`;
          }
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
        <div className="flex flex-col items-center space-y-4">
          {/* Main Voice Button */}
          <div className="relative">
            <Button
              type="button"
              className={`
                relative rounded-full p-0 border-2 transition-all duration-500 transform
                ${getMicColorClasses()}
                ${isExpanded 
                  ? 'w-16 h-16 scale-110 shadow-2xl' 
                  : 'w-12 h-12 hover:scale-105 shadow-md'
                }
                ${mode === 'listening' 
                  ? 'shadow-2xl animate-pulse' 
                  : ''
                }
                ${mode === 'processing' ? 'animate-spin' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={mode === 'listening' ? stopVoiceInput : startVoiceInput}
              disabled={disabled}
              title={mode === 'listening' ? "Stop voice input" : "Start speaking"}
            >
              {mode === 'processing' ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'listening' ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-white" />
              )}
            </Button>
            
            {/* Enhanced mystical mandala animation */}
            {mode === 'listening' && (
              <>
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                  <div className="w-full h-full rounded-full border-2 border-current animate-ping" style={{ animationDuration: '2s' }} />
                </div>
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="w-full h-full rounded-full border border-current animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                </div>
              </>
            )}
          </div>
          
          {/* Enhanced Dynamic Waveform Visualization */}
          {mode === 'listening' && (
            <div className="space-y-2">
              <div 
                ref={waveformRef}
                className={`flex items-center justify-center space-x-1 transition-all duration-500 ${
                  isExpanded ? 'scale-110' : ''
                }`}
              >
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-100"
                    style={{ 
                      backgroundColor: `var(--${micColor}-500, #14b8a6)`,
                      width: i === 4 ? '3px' : '2px', // Center bar slightly wider
                      height: '8px',
                      opacity: audioLevel > 0.05 ? 0.9 : 0.6,
                      boxShadow: audioLevel > 0.3 ? `0 0 8px var(--${micColor}-400, #14b8a6)` : 'none'
                    }}
                  />
                ))}
              </div>
              
              {/* "Listening..." text */}
              <p className="text-sm text-gray-600 font-medium animate-pulse">
                Listening...
              </p>
              
              {/* Audio level indicator */}
              <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 transition-all duration-100 rounded-full"
                  style={{ 
                    width: `${audioLevel * 100}%`,
                    backgroundColor: `var(--${micColor}-500, #14b8a6)`
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Real-time Transcript Display */}
          {(transcript || interimTranscript) && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-full shadow-lg animate-fadeIn">
              <div className="flex items-start gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Live Transcription
                </p>
              </div>
              <p className="text-sm leading-relaxed">
                {transcript && (
                  <span className="text-gray-900 font-medium">{transcript}</span>
                )}
                {interimTranscript && (
                  <span className="text-gray-500 italic ml-1 animate-pulse">
                    {interimTranscript}
                    <span className="inline-block w-0.5 h-4 bg-teal-500 ml-1 animate-pulse" />
                  </span>
                )}
              </p>
              
              {/* Confidence indicator for interim results */}
              {interimTranscript && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">Processing speech...</span>
                </div>
              )}
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
          
          {/* Dynamic Status Text */}
          <div className="text-center space-y-1">
            <p className="text-sm text-gray-600 font-medium">
              {mode === 'listening' 
                ? "🎙️ Voice Active - Speak naturally about scripture"
                : mode === 'processing'
                ? "⚡ Processing your voice input..."
                : "🎤 Tap microphone to speak or use text input"
              }
            </p>
            
            {/* Advanced features indicator */}
            {mode === 'listening' && (
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Noise Cancellation
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  {selectedLanguage.split('-')[0].toUpperCase()} Detection
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}