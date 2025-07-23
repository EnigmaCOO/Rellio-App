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
  
  // Auto-reader functionality
  const autoReader = useElevenLabsReader({
    scriptures: scriptures || [],
    onVerseHighlight: undefined // We'll handle highlighting directly in the component
  });

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
              onPlay={() => autoReader.startReading()}
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
              
              return (
                <div
                  key={scripture.verse}
                  id={`verse-${scripture.verse}`}
                  className={`group relative p-4 rounded-lg transition-all ${
                    isCurrentlyReading 
                      ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm' 
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