import { useState, useEffect, useRef } from "react";
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
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  
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
  
  // Clean up current audio
  const cleanupCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      setCurrentAudio(null);
    }
  };

  // Direct audio playback function
  const playVerse = async (verseIndex: number) => {
    if (!scriptures || verseIndex >= scriptures.length) {
      console.log('🏁 Finished reading all verses in chapter');
      setIsPlaying(false);
      setCurrentReadingVerse(null);
      cleanupCurrentAudio();
      return;
    }
    
    const verse = scriptures[verseIndex];
    if (!verse) return;
    
    try {
      // Clean up previous audio
      cleanupCurrentAudio();
      
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
        setCurrentAudio(audio);
        
        console.log('🔊 About to play audio...');
        
        // Set up event handlers
        audio.onloadstart = () => console.log('📥 Audio loading started');
        audio.oncanplay = () => console.log('✅ Audio can play');
        audio.onplay = () => console.log('▶️ Audio playback started');
        audio.onerror = (e) => console.error('❌ Audio error:', e);
        
        audio.onended = () => {
          console.log('🏁 Audio ended for verse', verse.verse);
          URL.revokeObjectURL(audioUrl);
          
          // Check if we should continue to next verse
          const nextVerseIndex = verseIndex + 1;
          console.log('Next verse check:', {
            currentVerse: verseIndex + 1,
            totalVerses: scriptures.length,
            nextIndex: nextVerseIndex,
            hasNext: nextVerseIndex < scriptures.length,
            isStillPlaying: isPlaying,
            isNotPaused: !isPaused
          });
          
          if (isPlayingRef.current && !isPausedRef.current && nextVerseIndex < scriptures.length) {
            console.log('🔄 Continuing to verse', nextVerseIndex + 1, 'after', pauseDuration, 'seconds');
            setTimeout(() => {
              playVerse(nextVerseIndex);
            }, pauseDuration * 1000);
          } else {
            console.log('🏁 Reading sequence complete or stopped');
            setIsPlaying(false);
            isPlayingRef.current = false;
            setCurrentReadingVerse(null);
          }
        };
        
        try {
          await audio.play();
          console.log('🎵 Audio play() started successfully for verse', verse.verse);
        } catch (playError) {
          console.error('❌ Audio play failed:', playError);
          URL.revokeObjectURL(audioUrl);
          // Try next verse on error
          if (isPlaying && !isPaused) {
            setTimeout(() => playVerse(verseIndex + 1), 500);
          }
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
    isPlayingRef.current = true;
    isPausedRef.current = false;
    playVerse(0);
  };
  
  const pauseReading = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    if (currentAudio) {
      currentAudio.pause();
    }
  };
  
  const stopReading = () => {
    setIsPlaying(false);
    setIsPaused(false);
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setCurrentReadingVerse(null);
    cleanupCurrentAudio();
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

  // Generate chapter tabs
  const generateChapterTabs = () => {
    const tabs = [];
    const maxTabsToShow = 12;
    
    if (maxChapters <= maxTabsToShow) {
      // Show all chapters if we have few
      for (let i = 1; i <= maxChapters; i++) {
        tabs.push(i);
      }
    } else {
      // Smart pagination for many chapters
      const start = Math.max(1, selectedChapter - 5);
      const end = Math.min(maxChapters, start + maxTabsToShow - 1);
      for (let i = start; i <= end; i++) {
        tabs.push(i);
      }
    }
    return tabs;
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Top Controls Section */}
      <div className="bg-white p-4 border-b border-gray-200">
        {/* Auto-Reader Controls */}
        {scriptures && scriptures.length > 0 && (
          <div className="flex items-center justify-center mb-4">
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

        {/* Title and Subtitle */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            {religionName} — {selectedBook}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {selectedReligion === 'quran' ? 'Surah' : 'Chapter'} {selectedChapter} of {maxChapters}
          </p>
        </div>

        {/* Chapter Tabs */}
        {maxChapters > 1 && (
          <div className="flex gap-2 overflow-x-auto bg-gray-100 p-2 rounded-lg">
            {generateChapterTabs().map(chapter => (
              <button
                key={chapter}
                onClick={() => onChapterChange(chapter)}
                className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                  selectedChapter === chapter
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
                aria-label={`Go to chapter ${chapter}`}
              >
                {chapter}
              </button>
            ))}
            {maxChapters > 12 && selectedChapter < maxChapters - 6 && (
              <button
                onClick={() => onChapterChange(Math.min(maxChapters, selectedChapter + 10))}
                className="px-3 py-1 text-sm font-medium rounded-full bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                aria-label="Show more chapters"
              >
                ...
              </button>
            )}
          </div>
        )}
      </div>

      {/* Verse Display Card - Fixed Height with Internal Scrolling */}
      <div className="flex-1 p-4">
        <Card className="h-full bg-white shadow-md rounded-xl border border-gray-200 flex flex-col" style={{ height: '60vh' }}>
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center text-red-500 py-12">
                <p className="text-lg">Error loading verses</p>
                <p className="text-sm mt-2">Please try again or select a different chapter.</p>
              </div>
            ) : scriptures && scriptures.length > 0 ? (
              <div className="space-y-6">
                {scriptures.map((scripture, index) => {
                  const isCurrentlyReading = autoReader.isPlaying && 
                                           !autoReader.isPaused && 
                                           autoReader.currentVerseIndex === index;
                  
                  const isHighlighted = currentReadingVerse === scripture.verse || 
                                      highlightedVerse === scripture.verse;
                  
                  return (
                    <div
                      key={scripture.verse}
                      id={`verse-${scripture.verse}`}
                      className={`group relative p-4 rounded-lg transition-all shadow-sm ${
                        isCurrentlyReading 
                          ? 'bg-blue-50 border-l-4 border-blue-600 shadow-lg' 
                          : isHighlighted
                          ? 'bg-yellow-50 border-l-4 border-yellow-500 shadow-md'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {scripture.verse}
                            </span>
                            <div className="flex-1">
                              <p className="text-lg text-gray-800 leading-relaxed mb-2">
                                {scripture.text}
                              </p>
                              <p className="text-sm font-bold text-gray-600">
                                {selectedBook} {selectedChapter}:{scripture.verse}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSpeakVerse(scripture.text, scripture.verse)}
                            className={`hover:bg-blue-50 border-blue-200 ${
                              speakingStates[scripture.verse] ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-gray-600'
                            }`}
                            title="Read aloud"
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyVerse(
                              scripture.text, 
                              `${selectedBook} ${selectedChapter}:${scripture.verse}`
                            )}
                            className="text-gray-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                            title="Copy verse and send to chat"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg">No verses available for this selection.</p>
                <p className="text-sm mt-2">Please select a different book or chapter.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}