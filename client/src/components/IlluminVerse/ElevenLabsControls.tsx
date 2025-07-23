import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Play, Pause, Square, Settings, Volume2, TestTube, Loader2 } from "lucide-react";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  gender?: string;
  age?: string;
  accent?: string;
  description?: string;
  use_case?: string;
}

interface ElevenLabsControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  volume: number;
  pauseDuration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (volume: number) => void;
  onPauseDurationChange: (duration: number) => void;
  onVoiceChange: (voiceIndex: number) => void;
  availableVoices: ElevenLabsVoice[];
  selectedVoiceIndex: number;
  disabled?: boolean;
  isLoading?: boolean;
}

const speedOptions = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" }
];

export function ElevenLabsControls({
  isPlaying,
  isPaused,
  speed,
  volume,
  pauseDuration,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  onVolumeChange,
  onPauseDurationChange,
  onVoiceChange,
  availableVoices,
  selectedVoiceIndex,
  disabled = false,
  isLoading = false
}: ElevenLabsControlsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);

  const testVoice = async (voiceIndex: number) => {
    if (testingVoice || !availableVoices[voiceIndex]) return;
    
    setTestingVoice(true);
    
    try {
      const voice = availableVoices[voiceIndex];
      const testPhrase = "This is a preview of the selected voice for reading sacred texts.";
      
      // If it's a browser voice, use Speech Synthesis
      if (voice.voice_id.startsWith('browser_')) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(testPhrase);
        const browserVoices = speechSynthesis.getVoices();
        const browserVoiceIndex = parseInt(voice.voice_id.split('_')[1]);
        
        if (browserVoices[browserVoiceIndex]) {
          utterance.voice = browserVoices[browserVoiceIndex];
        }
        
        utterance.rate = speed * 0.85;
        utterance.pitch = 0.9;
        utterance.volume = volume;
        
        utterance.onend = () => setTestingVoice(false);
        utterance.onerror = () => setTestingVoice(false);
        
        speechSynthesis.speak(utterance);
      } else {
        // Use ElevenLabs API
        const response = await fetch('/api/elevenlabs/speak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: testPhrase,
            voiceId: voice.voice_id,
            settings: {
              stability: 0.5,
              similarityBoost: 0.75,
              style: 0.0,
              useSpeakerBoost: true
            }
          }),
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.volume = volume;
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setTestingVoice(false);
          };
          
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            setTestingVoice(false);
          };
          
          await audio.play();
        } else {
          throw new Error('Failed to generate test audio');
        }
      }
    } catch (error) {
      console.error('Voice test error:', error);
      setTestingVoice(false);
    }
  };

  const getVoiceDisplayName = (voice: ElevenLabsVoice) => {
    let displayName = voice.name;
    
    // Add quality indicators
    const isHighQuality = voice.category === 'professional' || voice.category === 'premade';
    const qualityIcon = isHighQuality ? "✨" : "🔊";
    
    // Add gender indicator
    const genderIcon = voice.gender === 'male' ? "♂" : voice.gender === 'female' ? "♀" : "";
    
    return `${qualityIcon} ${displayName} ${genderIcon}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading ElevenLabs voices...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-4 bg-white/50 backdrop-blur-sm rounded-lg border">
      {/* Play/Pause Button */}
      <Button
        onClick={() => {
          console.log('🎯 Play button clicked!', { 
            isPlaying, 
            isPaused, 
            disabled,
            availableVoicesCount: availableVoices.length 
          });
          if (isPlaying && !isPaused) {
            console.log('📥 Calling onPause');
            onPause();
          } else {
            console.log('▶️ Calling onPlay');
            onPlay();
          }
        }}
        disabled={disabled || availableVoices.length === 0}
        size="sm"
        className="flex items-center gap-2"
      >
        {isPlaying && !isPaused ? (
          <>
            <Pause className="h-4 w-4" />
            Pause
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            {isPlaying && isPaused ? 'Resume' : 'Play'}
          </>
        )}
      </Button>

      {/* Stop Button */}
      <Button
        onClick={onStop}
        disabled={!isPlaying}
        size="sm"
        variant="outline"
      >
        <Square className="h-4 w-4" />
      </Button>

      {/* Speed Control */}
      <Select value={speed.toString()} onValueChange={(value) => onSpeedChange(parseFloat(value))}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {speedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Settings Popover */}
      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <h3 className="font-medium">Audio Settings</h3>
            
            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="text-sm">Volume: {Math.round(volume * 100)}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={(value) => onVolumeChange(value[0])}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Pause Duration */}
            <div className="space-y-2">
              <span className="text-sm">Pause between verses: {pauseDuration}s</span>
              <Slider
                value={[pauseDuration]}
                onValueChange={(value) => onPauseDurationChange(value[0])}
                max={5}
                min={0.5}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Voice Selection */}
            {availableVoices.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Voice Selection</span>
                <Select 
                  value={selectedVoiceIndex.toString()} 
                  onValueChange={(value) => onVoiceChange(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice, index) => (
                      <SelectItem key={voice.voice_id} value={index.toString()}>
                        {getVoiceDisplayName(voice)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testVoice(selectedVoiceIndex)}
                    disabled={testingVoice || availableVoices.length === 0}
                    className="text-xs"
                  >
                    {testingVoice ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-3 w-3 mr-1" />
                        Test Voice
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>✨ = ElevenLabs voice • 🔊 = Browser voice</p>
                  <p>♀ = Female • ♂ = Male</p>
                  {availableVoices[selectedVoiceIndex]?.description && (
                    <p className="italic">{availableVoices[selectedVoiceIndex].description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts */}
            <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
              <p className="font-medium">Keyboard Shortcuts:</p>
              <p>Space: Play/Pause</p>
              <p>Escape: Stop</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Indicator */}
      {isPlaying && (
        <div className="text-sm text-green-600 font-medium">
          {isPaused ? 'Paused' : 'Reading...'}
        </div>
      )}
    </div>
  );
}