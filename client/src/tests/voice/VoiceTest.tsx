
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useVoiceModeHandler } from '@/components/chat/VoiceModeHandler';

export function VoiceTest() {
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
    playText,
    stopPlayback,
    isPlaying,
    volume,
    setVolume
  } = useVoiceModeHandler({
    onTranscript: (text, isInterim) => {
      console.log('Test transcript:', text, 'interim:', isInterim);
    },
    onAutoSend: (text) => {
      console.log('Test auto-send:', text);
    },
    onStateChange: (state) => {
      console.log('Test state change:', state);
    },
    onInterrupt: () => {
      console.log('Test interrupt');
    }
  });

  return (
    <Card className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Voice Test Component</h2>
      
      <div className="space-y-4">
        <div>
          <p>Supported: {isSupported ? 'Yes' : 'No'}</p>
          <p>Permission: {hasPermission ? 'Yes' : 'No'}</p>
          <p>State: {voiceState}</p>
          <p>Audio Level: {Math.round(audioLevel)}</p>
          <p>Confidence: {Math.round(confidence * 100)}%</p>
        </div>

        <div>
          <p className="font-medium">Current Transcript:</p>
          <p className="text-sm bg-gray-100 p-2 rounded min-h-[40px]">
            {currentTranscript || 'No transcript yet...'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={toggleListening}>
            {isListening ? 'Stop' : 'Start'} Listening
          </Button>
          <Button onClick={() => playText('Test audio playback')}>
            Test TTS
          </Button>
          {isPlaying && (
            <Button onClick={stopPlayback}>
              Stop TTS
            </Button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Volume: {Math.round(volume * 100)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </Card>
  );
}
