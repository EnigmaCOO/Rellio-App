import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SimpleVoiceInterfaceProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// Simple Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function SimpleVoiceInterface({
  onSendMessage,
  disabled = false,
  placeholder = "Click microphone to speak or type your message...",
  className
}: SimpleVoiceInterfaceProps) {
  // Simple state management
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    console.log('🎤 Speech recognition supported:', !!SpeechRecognition);
  }, []);

  // Clear auto-send timeout
  const clearAutoSendTimeout = useCallback(() => {
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
  }, []);

  // Auto-send function
  const scheduleAutoSend = useCallback((text: string) => {
    clearAutoSendTimeout();
    
    if (text.trim()) {
      console.log('🚀 Scheduling auto-send for:', text);
      autoSendTimeoutRef.current = setTimeout(() => {
        console.log('🚀 AUTO-SENDING:', text);
        onSendMessage(text.trim());
        setTranscript('');
        setTextMessage('');
        stopListening();
      }, 1500); // 1.5 second delay
    }
  }, [onSendMessage, clearAutoSendTimeout]);

  // Start listening function
  const startListening = useCallback(async () => {
    if (!isSupported || disabled) {
      console.error('❌ Cannot start listening - not supported or disabled');
      return false;
    }

    try {
      console.log('🎤 STARTING SPEECH RECOGNITION...');
      
      // Stop any existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      // Create new recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      // Configure recognition
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      // Handle results
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const fullTranscript = finalTranscript + interimTranscript;
        console.log('📝 TRANSCRIPT UPDATE:', { final: finalTranscript, interim: interimTranscript, full: fullTranscript });
        
        // Update display immediately
        setTranscript(fullTranscript);
        setTextMessage(fullTranscript);

        // Schedule auto-send for final results
        if (finalTranscript.trim()) {
          scheduleAutoSend(finalTranscript);
        }
      };

      // Handle start
      recognitionRef.current.onstart = () => {
        console.log('🎤 ✅ RECOGNITION STARTED');
        setIsListening(true);
      };

      // Handle end
      recognitionRef.current.onend = () => {
        console.log('🎤 🛑 RECOGNITION ENDED');
        setIsListening(false);
      };

      // Handle errors
      recognitionRef.current.onerror = (event: any) => {
        console.error('🎤 ❌ RECOGNITION ERROR:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setIsListening(false);
        }
      };

      // Start recognition
      recognitionRef.current.start();
      return true;

    } catch (error) {
      console.error('❌ Failed to start speech recognition:', error);
      setIsListening(false);
      return false;
    }
  }, [isSupported, disabled, scheduleAutoSend]);

  // Stop listening function
  const stopListening = useCallback(() => {
    console.log('🛑 STOPPING SPEECH RECOGNITION');
    
    clearAutoSendTimeout();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
      recognitionRef.current = null;
    }
    
    setIsListening(false);
  }, [clearAutoSendTimeout]);

  // Handle microphone button click
  const handleMicClick = async () => {
    console.log('🎤 MIC BUTTON CLICKED - Current state:', { isListening, isSupported });
    
    if (isListening) {
      stopListening();
    } else {
      const success = await startListening();
      if (!success) {
        console.error('❌ Failed to start listening');
      }
    }
  };

  // Handle text input
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTextMessage(value);
    setTranscript(value);
  };

  // Handle text send
  const handleTextSend = () => {
    if (textMessage.trim()) {
      onSendMessage(textMessage.trim());
      setTextMessage('');
      setTranscript('');
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSend();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 p-3 bg-white rounded-xl border-2 border-gray-100 shadow-md hover:shadow-lg transition-all duration-300">
        
        {/* Microphone Button */}
        <Button
          onClick={handleMicClick}
          disabled={disabled || !isSupported}
          type="button"
          className={cn(
            "w-10 h-10 rounded-full border-2 transition-all duration-300 relative",
            "hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0",
            "flex items-center justify-center",
            isListening
              ? "bg-teal-500 hover:bg-teal-600 border-teal-400 text-white shadow-lg shadow-teal-300/50 animate-pulse"
              : "bg-white hover:bg-teal-50 border-teal-200 text-teal-600 hover:border-teal-300",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {isListening ? (
            <Square className="w-4 h-4 text-white" />
          ) : (
            <Mic className="w-4 h-4 text-teal-600" />
          )}
          
          {/* Recording indicator dot */}
          {isListening && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white" />
          )}
        </Button>

        {/* Input Field - Shows real-time transcript */}
        <Input
          value={textMessage}
          onChange={handleTextChange}
          onKeyPress={handleKeyPress}
          placeholder={isListening ? "🎤 Listening... speak now" : placeholder}
          disabled={disabled}
          className={cn(
            "border-0 focus-visible:ring-0 transition-all duration-200 font-medium",
            isListening
              ? "bg-teal-50 placeholder-teal-600 text-teal-900"
              : "bg-transparent placeholder-gray-500 text-gray-900"
          )}
        />

        {/* Send Button */}
        <Button
          onClick={handleTextSend}
          disabled={disabled || !textMessage.trim()}
          size="sm"
          className="bg-teal-500 hover:bg-teal-600 text-white flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Status Messages */}
      {!isSupported && (
        <div className="mt-2 text-xs text-red-500 text-center">
          Voice input not supported in this browser
        </div>
      )}
      
      {isListening && (
        <div className="mt-2 text-xs text-teal-600 text-center font-medium animate-pulse">
          🔴 Recording... speak clearly
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-2 text-xs text-gray-400 font-mono">
        Status: {isListening ? 'LISTENING' : 'IDLE'} | 
        Transcript: "{transcript}" | 
        Supported: {isSupported ? 'YES' : 'NO'}
      </div>
    </div>
  );
}