import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioPlaybackButtonProps {
  text: string;
  voiceId?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function AudioPlaybackButton({ 
  text, 
  voiceId = "onwK4e9ZLuTAKqWW03F9", // Daniel - informative/educational British male voice
  className = "",
  size = "sm"
}: AudioPlaybackButtonProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const playWithElevenLabs = async () => {
    setIsLoading(true);
    
    try {
      console.log('🎵 Generating ElevenLabs audio for text:', text.substring(0, 50) + '...');
      
      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voiceId: voiceId,
          settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        const audio = new Audio(url);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsPlaying(false);
          console.log('🎵 ElevenLabs audio finished');
        };
        
        audio.onerror = () => {
          setIsPlaying(false);
          setIsLoading(false);
          console.error('🎵 ElevenLabs audio playback failed');
          toast({
            title: "Audio playback failed",
            description: "Could not play AI response audio",
            variant: "destructive",
          });
        };
        
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
        console.log('🎵 ElevenLabs audio started successfully');
        
      } else {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
    } catch (error) {
      console.error('🎵 ElevenLabs error:', error);
      setIsLoading(false);
      setIsPlaying(false);
      toast({
        title: "ElevenLabs audio failed",
        description: "Could not generate audio with ElevenLabs voice",
        variant: "destructive",
      });
    }
  };



  const handlePlayPause = () => {
    if (isPlaying) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start playback using ElevenLabs only
      playWithElevenLabs();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={`
        rounded-full p-2 w-8 h-8 hover:bg-teal-50 hover:text-teal-700 transition-all duration-200
        ${isPlaying ? 'text-teal-600 bg-teal-50' : 'text-gray-500'}
        ${className}
      `}
      onClick={handlePlayPause}
      disabled={isLoading}
      title={isPlaying ? "Stop audio" : "Play with voice"}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </Button>
  );
}