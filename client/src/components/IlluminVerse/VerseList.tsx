import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Volume2, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useElevenLabsReader } from "@/hooks/useElevenLabsReader";
import { ElevenLabsControls } from "./ElevenLabsControls";
import type { Religion, Scripture } from "@shared/schema";

interface VerseListProps {
  selectedReligion: Religion | null;
  selectedBook: string;
  selectedChapter: number;
  scriptures?: Scripture[];
  isLoading: boolean;
  isError?: boolean;
  religionName: string;
  onChapterChange: (chapter: number) => void;
  onCopyVerse?: (verseText: string) => void;
  highlightedVerse?: number;
  maxChapters?: number;
}

export function VerseList({
  selectedReligion,
  selectedBook,
  selectedChapter,
  scriptures,
  isLoading,
  isError = false,
  religionName,
  onChapterChange,
  onCopyVerse,
  highlightedVerse,
  maxChapters = 10
}: VerseListProps) {
  const { toast } = useToast();
  const [speakingStates, setSpeakingStates] = useState<Record<number, boolean>>({});
  
  // State for verse highlighting and auto-reader
  const [currentReadingVerse, setCurrentReadingVerse] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [pauseDuration, setPauseDuration] = useState(1.5);
  const [isVoicesLoading, setIsVoicesLoading] = useState(true);
  
  // Load ElevenLabs voices
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await fetch('/api/elevenlabs/voices');
        if (response.ok) {
          const data = await response.json();
          const maleVoices = data.recommendedMaleVoices || [];
          setAvailableVoices(maleVoices);
          console.log('✅ Voices loaded:', maleVoices.length);
        }
      } catch (error) {
        console.error('Voice loading error:', error);
      } finally {
        setIsVoicesLoading(false);
      }
    };
    loadVoices();
  }, []);
  
  // Direct audio playback function
  const playVerse = async (verseIndex: number) => {
    if (!scriptures || verseIndex >= scriptures.length) {
      console.log('🏁 Finished reading all verses in chapter');
      setIsPlaying(false);
      setCurrentReadingVerse(null);
      return;
    }
    
    const verse = scriptures[verseIndex];
    if (!verse) return;
    
    try {
      setCurrentVerseIndex(verseIndex);
      setCurrentReadingVerse(verse.verse);
      
      const selectedVoice = availableVoices[selectedVoiceIndex];
      if (!selectedVoice) return;
      
      console.log('🎵 Playing verse:', verse.verse, verse.text.substring(0, 50));
      
      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: verse.text,
          voiceId: selectedVoice.voice_id,
          settings: { stability: 0.5, similarityBoost: 0.75 }
        }),
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        console.log('📊 Audio blob size:', audioBlob.size, 'bytes');
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.volume = volume;
        audio.playbackRate = speed;
        
        console.log('🔊 About to play audio...');
        
        audio.onloadstart = () => console.log('📥 Audio loading started');
        audio.oncanplay = () => console.log('✅ Audio can play');
        audio.onplay = () => console.log('▶️ Audio playback started');
        audio.onerror = (e) => console.error('❌ Audio error:', e);
        
        audio.onended = () => {
          console.log('🏁 Audio ended, cleaning up');
          console.log('Next verse info:', {
            currentIndex: verseIndex,
            nextIndex: verseIndex + 1,
            totalVerses: scriptures?.length,
            isPlaying,
            isPaused,
            pauseDuration
          });
          URL.revokeObjectURL(audioUrl);
          if (isPlaying && !isPaused) {
            console.log('🔄 Moving to next verse after', pauseDuration, 'seconds');
            setTimeout(() => playVerse(verseIndex + 1), pauseDuration * 1000);
          } else {
            console.log('⏹️ Not continuing - isPlaying:', isPlaying, 'isPaused:', isPaused);
          }
        };
        
        try {
          await audio.play();
          console.log('🎵 Audio play() completed successfully');
        } catch (playError) {
          console.error('❌ Audio play failed:', playError);
        }
      } else {
        console.error('❌ API response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Playback error:', error);
      if (isPlaying && !isPaused) {
        setTimeout(() => playVerse(verseIndex + 1), 500);
      }
    }
  };
  
  const startReading = () => {
    console.log('▶️ Starting reading...', {
      scripturesCount: scriptures?.length || 0,
      firstVerse: scriptures?.[0]?.verse,
      lastVerse: scriptures?.[scriptures.length - 1]?.verse
    });
    setIsPlaying(true);
    setIsPaused(false);
    playVerse(0);
  };
  
  const pauseReading = () => {
    setIsPaused(true);
  };
  
  const stopReading = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentReadingVerse(null);
  };
  
  // Create autoReader object for compatibility
  const autoReader = {
    isPlaying,
    isPaused,
    currentVerseIndex,
    speed,
    volume,
    pauseDuration,
    availableVoices,
    selectedVoiceIndex,
    startReading,
    pauseReading,
    stopReading,
    setSpeed,
    setVolume,
    setPauseDuration,
    setVoice: setSelectedVoiceIndex,
    isLoading: isVoicesLoading
  };

  // Handle verse highlighting when highlightedVerse prop changes
  useEffect(() => {
    if (highlightedVerse) {
      const verseId = `verse-${highlightedVerse}`;
      
      const attemptHighlight = (attempts = 0) => {
        const verseElement = document.getElementById(verseId);
        
        if (verseElement) {
          verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          verseElement.style.backgroundColor = '#fef3c7'; // yellow-100
          verseElement.style.borderLeft = '4px solid #f59e0b'; // yellow-600
          verseElement.style.transition = 'all 0.3s ease';
          
          setTimeout(() => {
            verseElement.style.backgroundColor = '';
            verseElement.style.borderLeft = '';
          }, 3000);
        } else if (attempts < 5) {
          setTimeout(() => attemptHighlight(attempts + 1), 500 * (attempts + 1));
        }
      };
      
      attemptHighlight();
    }
  }, [highlightedVerse, scriptures]);

  // Handle auto-reader verse highlighting
  useEffect(() => {
    if (currentReadingVerse) {
      const verseId = `verse-${currentReadingVerse}`;
      const verseElement = document.getElementById(verseId);
      
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentReadingVerse]);

  const handleCopyVerse = (verseText: string, verseRef: string) => {
    const fullText = `"${verseText}" - ${verseRef}`;
    navigator.clipboard.writeText(fullText);
    toast({
      title: "Verse copied",
      description: "Verse copied to clipboard",
    });
    
    if (onCopyVerse) {
      onCopyVerse(fullText);
    }
  };

  const handleSpeakVerse = async (verseText: string, verseNumber: number) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      if (speakingStates[verseNumber]) {
        setSpeakingStates(prev => ({ ...prev, [verseNumber]: false }));
        return;
      }

      setSpeakingStates(prev => ({ ...prev, [verseNumber]: true }));
      
      const utterance = new SpeechSynthesisUtterance(verseText);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onend = () => {
        setSpeakingStates(prev => ({ ...prev, [verseNumber]: false }));
      };
      
      utterance.onerror = () => {
        setSpeakingStates(prev => ({ ...prev, [verseNumber]: false }));
        toast({
          title: "Speech Error",
          description: "Could not read the verse aloud",
          variant: "destructive",
        });
      };

      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Speech Not Supported",
        description: "Text-to-speech is not supported in your browser",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-rellio-white rounded-xl shadow-md p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="bg-rellio-white rounded-xl shadow-md p-6">
        <div className="text-center text-red-600">
          <p>Error loading scriptures. Please try again.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden h-[50vh] md:h-[40vh] flex flex-col">
      {/* Sticky Header */}
      <div className="bg-white p-4 border-b border-gray-100 flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {religionName} — {selectedBook}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Page {selectedChapter} of {maxChapters}
            </p>
          </div>
          
          {/* Chapter Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChapterChange(Math.max(1, selectedChapter - 1))}
              disabled={selectedChapter <= 1}
              className="text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChapterChange(Math.min(maxChapters, selectedChapter + 1))}
              disabled={selectedChapter >= maxChapters}
              className="text-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Auto-Reader Controls */}
        {scriptures && scriptures.length > 0 && (
          <div className="flex items-center justify-center">
            <ElevenLabsControls
              isPlaying={autoReader.isPlaying}
              isPaused={autoReader.isPaused}
              speed={autoReader.speed}
              volume={autoReader.volume}
              pauseDuration={autoReader.pauseDuration}
              onPlay={autoReader.startReading}
              onPause={autoReader.pauseReading}
              onStop={autoReader.stopReading}
              onSpeedChange={autoReader.setSpeed}
              onVolumeChange={autoReader.setVolume}
              onPauseDurationChange={autoReader.setPauseDuration}
              onVoiceChange={autoReader.setVoice}
              availableVoices={autoReader.availableVoices}
              selectedVoiceIndex={autoReader.selectedVoiceIndex}
              disabled={!scriptures || scriptures.length === 0}
              isLoading={autoReader.isLoading}
            />
          </div>
        )}
      </div>

      {/* Verses with Internal Scrolling */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {scriptures && scriptures.length > 0 ? (
            scriptures.map((scripture, index) => {
              const isCurrentlyReading = autoReader.isPlaying && 
                                       !autoReader.isPaused && 
                                       autoReader.currentVerseIndex === index;
              
              const isHighlighted = currentReadingVerse === scripture.verse || 
                                  highlightedVerse === scripture.verse;
              
              return (
                <div
                  key={scripture.verse}
                  id={`verse-${scripture.verse}`}
                  className={`group relative p-4 rounded-lg transition-all ${
                    isCurrentlyReading 
                      ? 'bg-blue-200 border-l-4 border-blue-600 shadow-md' 
                      : isHighlighted
                      ? 'bg-yellow-100 border-l-4 border-yellow-500 shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <span className="text-lg font-bold text-blue-600 mt-1 min-w-[2rem]">
                            {scripture.verse}
                          </span>
                          <div className="flex-1">
                            <p className="text-lg text-gray-800 leading-relaxed">
                              {scripture.text}
                            </p>
                            <p className="text-sm font-semibold text-gray-600 mt-2">
                              {selectedBook} {selectedChapter}:{scripture.verse}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSpeakVerse(scripture.text, scripture.verse)}
                          className={`text-gray-500 hover:text-blue-600 ${
                            speakingStates[scripture.verse] ? 'text-blue-600' : ''
                          }`}
                          title="Read aloud"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyVerse(
                            scripture.text, 
                            `${selectedBook} ${selectedChapter}:${scripture.verse}`
                          )}
                          className="text-gray-500 hover:text-blue-600"
                          title="Copy verse"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No verses available for this selection.</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}