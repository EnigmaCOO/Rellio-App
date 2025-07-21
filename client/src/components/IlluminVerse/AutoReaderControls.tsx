import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Play, Pause, Square, Settings, Volume2 } from "lucide-react";

interface AutoReaderControlsProps {
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
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceIndex: number;
  disabled?: boolean;
}

const speedOptions = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" }
];

export function AutoReaderControls({
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
  disabled = false
}: AutoReaderControlsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    // Only handle shortcuts when not typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (isPlaying && !isPaused) {
          onPause();
        } else {
          onPlay();
        }
        break;
      case 'Escape':
        if (isPlaying || isPaused) {
          onStop();
        }
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [isPlaying, isPaused]);

  return (
    <div className="flex items-center gap-2">
      {/* Main Play/Pause Button */}
      <Button
        variant={isPlaying ? "default" : "outline"}
        size="sm"
        onClick={isPlaying && !isPaused ? onPause : onPlay}
        disabled={disabled}
        className={`rounded-full shadow-sm transition-all hover:scale-105 ${
          isPlaying ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50'
        }`}
        title={isPlaying && !isPaused ? "Pause auto-reader (Space)" : "Play entire chapter aloud (Space)"}
        aria-label={isPlaying && !isPaused ? "Pause auto-reader" : "Play entire chapter aloud"}
      >
        {isPlaying && !isPaused ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Stop Button (only show when playing or paused) */}
      {(isPlaying || isPaused) && (
        <Button
          variant="outline"
          size="sm"
          onClick={onStop}
          className="rounded-full shadow-sm hover:scale-105 hover:bg-red-50 hover:text-red-600"
          title="Stop auto-reader (Esc)"
          aria-label="Stop auto-reader"
        >
          <Square className="h-3 w-3" />
        </Button>
      )}

      {/* Speed Control */}
      <Select value={speed.toString()} onValueChange={(value) => onSpeedChange(parseFloat(value))}>
        <SelectTrigger className="w-20 h-8 text-xs" disabled={disabled}>
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
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="rounded-full p-2 hover:bg-gray-100"
            title="Audio settings"
            aria-label="Audio settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="bottom" align="end">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Audio Settings</h4>
            
            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium">Volume</label>
                <span className="text-xs text-gray-500 ml-auto">{Math.round(volume * 100)}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={(values) => onVolumeChange(values[0])}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Pause Duration */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Pause Between Verses</label>
                <span className="text-xs text-gray-500 ml-auto">{pauseDuration}s</span>
              </div>
              <Slider
                value={[pauseDuration]}
                onValueChange={(values) => onPauseDurationChange(values[0])}
                max={5}
                min={0.5}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Voice Selection */}
            {availableVoices.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Voice</label>
                <Select 
                  value={selectedVoiceIndex.toString()} 
                  onValueChange={(value) => onVoiceChange(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="text-xs text-gray-500 pt-2 border-t">
              <p>Keyboard shortcuts:</p>
              <p>• Spacebar: Play/Pause</p>
              <p>• Escape: Stop</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}