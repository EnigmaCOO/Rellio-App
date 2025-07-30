import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface VoiceFirstInterfaceProps {
  onSendMessage: (message: string) => void;
  onInterruption: (message: string) => void;
  isStreaming: boolean;
  context: {
    religion: string | null;
    book: string | null;
  };
  disabled: boolean;
}

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

export function VoiceFirstInterface({ 
  onSendMessage, 
  onInterruption, 
  isStreaming, 
  context,
  disabled 
}: VoiceFirstInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('Voice recognition started');
          setVoiceError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              currentTranscript += result[0].transcript;
            }
          }
          
          if (currentTranscript) {
            setTranscript(prev => prev + currentTranscript);
            setTextInput(prev => prev + currentTranscript);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setVoiceError(`Voice recognition error: ${event.error}`);
          setIsRecording(false);
          
          if (event.error === 'not-allowed') {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access to use voice input.",
              variant: "destructive"
            });
          }
        };

        recognition.onend = () => {
          console.log('Voice recognition ended');
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } else {
        setVoiceError('Speech recognition not supported in this browser');
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [toast]);

  const handleStartRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice Recognition Unavailable",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive"
      });
      return;
    }

    if (!hasConsented) {
      toast({
        title: "Microphone Permission Required",
        description: "Please grant microphone permission to use voice input.",
        variant: "default"
      });
      setHasConsented(true);
    }

    try {
      setIsRecording(true);
      setTranscript('');
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsRecording(false);
      toast({
        title: "Voice Input Error",
        description: "Failed to start voice recognition.",
        variant: "destructive"
      });
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendMessage = () => {
    const message = textInput.trim();
    console.log('Attempting to send message:', message);
    console.log('Disabled:', disabled, 'IsStreaming:', isStreaming);
    
    if (message && !disabled && !isStreaming) {
      console.log('Sending message via onSendMessage callback');
      onSendMessage(message);
      setTextInput('');
      setTranscript('');
      console.log('Text input cleared');
    } else {
      console.log('Message not sent - validation failed');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Privacy consent modal
  if (!hasConsented) {
    return (
      <div className="p-4 bg-gray-50 border-t">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="font-medium text-gray-900 mb-2">Voice Input Privacy</h3>
          <p className="text-sm text-gray-600 mb-4">
            This feature uses your browser's speech recognition to convert voice to text. 
            Your voice data is processed locally and not stored on our servers.
          </p>
          <Button 
            onClick={() => setHasConsented(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            I Understand - Enable Voice Input
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border-t">
      {/* Voice Input Interface - Matching Screenshots */}
      <div className="flex items-center gap-3 bg-black/70 backdrop-blur-sm rounded-full px-4 py-3">
        {/* Red Record Button */}
        <Button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={disabled || isStreaming}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-red-500 hover:bg-red-600'
            }
            text-white shadow-lg transition-all duration-200
            ${isRecording ? 'animate-pulse' : ''}
          `}
        >
          {isRecording ? (
            <Square className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        {/* Text Input Field */}
        <Input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={disabled || isStreaming}
          className="
            flex-1 bg-transparent border-none text-white placeholder-gray-300
            focus:ring-0 focus:outline-none text-base
          "
        />

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={!textInput.trim() || disabled || isStreaming}
          className="
            bg-white text-black hover:bg-gray-100 
            px-6 py-2 rounded-full font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          Send
        </Button>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="mt-2 text-center">
          <span className="text-sm text-red-600 font-medium">
            🎤 Recording... Click stop when finished
          </span>
        </div>
      )}

      {/* Voice Error Display */}
      {voiceError && (
        <div className="mt-2 text-center">
          <span className="text-sm text-red-600">
            {voiceError}
          </span>
        </div>
      )}
    </div>
  );
}