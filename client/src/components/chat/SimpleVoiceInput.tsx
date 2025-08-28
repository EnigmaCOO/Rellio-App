import { useState, useRef, useCallback } from 'react';

interface SimpleVoiceInputProps {
  onTranscript: (text: string) => void;
  onListeningChange: (listening: boolean) => void;
}

export const SimpleVoiceInput = ({ onTranscript, onListeningChange }: SimpleVoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert('Speech recognition not supported in this browser. Try Chrome or Edge.');
        return false;
      }

      // Stop any existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure for best results
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('🎤 Voice input started');
        setIsListening(true);
        onListeningChange(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        console.log('🎤 Transcript:', transcript);
        onTranscript(transcript);

        // If final result, auto-submit after short delay
        if (event.results[event.results.length - 1].isFinal && transcript.trim()) {
          setTimeout(() => {
            stopListening();
          }, 1000);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('🚫 Voice recognition error:', event.error);
        setIsListening(false);
        onListeningChange(false);
        
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone permissions and try again.');
        }
      };

      recognition.onend = () => {
        console.log('🛑 Voice recognition ended');
        setIsListening(false);
        onListeningChange(false);
        recognitionRef.current = null;
      };

      recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      alert('Voice recognition failed to start. Please check your browser and microphone.');
      return false;
    }
  }, [onTranscript, onListeningChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    onListeningChange(false);
  }, [onListeningChange]);

  return {
    isListening,
    startListening,
    stopListening
  };
};