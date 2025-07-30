import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioPlaybackButtonProps {
  text: string;
  voiceId?: string;
  voiceTone?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function AudioPlaybackButton({ 
  text, 
  voiceId = "onwK4e9ZLuTAKqWW03F9", // Daniel - informative/educational British male voice
  voiceTone = "scholarly",
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
      console.log('🎵 Using voice ID:', voiceId, 'with tone:', voiceTone);
      
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

      console.log('🎵 ElevenLabs response status:', response.status);
      console.log('🎵 ElevenLabs response headers:', response.headers.get('content-type'));

      if (response.ok) {
        const audioBlob = await response.blob();
        console.log('🎵 Audio blob size:', audioBlob.size, 'bytes');
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        const audio = new Audio(url);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsPlaying(false);
          console.log('🎵 ElevenLabs audio finished');
        };
        
        audio.onerror = (error) => {
          setIsPlaying(false);
          setIsLoading(false);
          console.error('🎵 ElevenLabs audio playback failed:', error);
          toast({
            title: "Audio playback failed",
            description: "Could not play AI response audio",
            variant: "destructive",
          });
        };
        
        // Wait for audio to be ready before playing
        audio.onloadeddata = async () => {
          try {
            console.log('🎵 Audio data loaded, starting playback...');
            await audio.play();
            setIsPlaying(true);
            setIsLoading(false);
            console.log('🎵 ElevenLabs audio started successfully');
          } catch (playError) {
            console.error('🎵 Audio play failed:', playError);
            setIsPlaying(false);
            setIsLoading(false);
            
            // Handle the specific "interrupted by pause" error
            if (playError.name === 'AbortError') {
              toast({
                title: "Audio interrupted",
                description: "Audio playback was interrupted. Please try again.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Audio playback failed",
                description: "Could not play AI response audio",
                variant: "destructive",
              });
            }
          }
        };
        
      } else {
        const errorText = await response.text();
        console.error('🎵 ElevenLabs API error:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('🎵 ElevenLabs error:', error);
      setIsLoading(false);
      setIsPlaying(false);
      toast({
        title: "ElevenLabs audio failed",
        description: error instanceof Error ? error.message : "Could not generate audio with ElevenLabs voice",
        variant: "destructive",
      });
    }
  };



  const handlePlayPause = () => {
    if (isPlaying || isLoading) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0; // Reset to beginning
        audioRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
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