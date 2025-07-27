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
  voiceId = "21m00Tcm4TlvDq8ikWAM", // Default ElevenLabs voice
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
      
      // Fallback to browser speech synthesis
      playWithBrowserSpeech();
    }
  };

  const playWithBrowserSpeech = () => {
    try {
      if ('speechSynthesis' in window) {
        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = 'en-US';
        
        // Try to find a good English voice
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.includes('Google') || voice.name.includes('Microsoft'))
        );
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        
        utterance.onstart = () => {
          setIsPlaying(true);
          setIsLoading(false);
          console.log('🎵 Browser speech started');
        };
        
        utterance.onend = () => {
          setIsPlaying(false);
          console.log('🎵 Browser speech finished');
        };
        
        utterance.onerror = () => {
          setIsPlaying(false);
          setIsLoading(false);
          console.error('🎵 Browser speech failed');
          toast({
            title: "Speech unavailable",
            description: "Could not play audio response",
            variant: "destructive",
          });
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        throw new Error('Speech synthesis not supported');
      }
    } catch (error) {
      console.error('🎵 Browser speech error:', error);
      setIsLoading(false);
      toast({
        title: "Audio unavailable",
        description: "Speech synthesis not supported in this browser",
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
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Start playback (try ElevenLabs first, fallback to browser)
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