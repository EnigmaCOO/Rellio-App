import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export const VoiceTest = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Ready to test');

  const testVoice = () => {
    setStatus('Testing...');
    setTranscript('');
    
    if (!('webkitSpeechRecognition' in window)) {
      setStatus('❌ webkitSpeechRecognition not found');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    
    // Minimal configuration
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setStatus('🎤 Listening now...');
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let result = '';
      for (let i = 0; i < event.results.length; i++) {
        result += event.results[i][0].transcript;
      }
      setTranscript(result);
      setStatus(`Got: "${result}"`);
    };

    recognition.onerror = (event: any) => {
      setStatus(`❌ Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setStatus('Ended');
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setStatus(`❌ Start failed: ${e}`);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-yellow-50">
      <h3 className="font-bold mb-2">🔧 Voice Test</h3>
      <div className="space-y-2">
        <Button onClick={testVoice} disabled={isListening}>
          {isListening ? 'Listening...' : 'Test Voice'}
        </Button>
        <div>Status: {status}</div>
        <div>Transcript: "{transcript}"</div>
      </div>
    </div>
  );
};