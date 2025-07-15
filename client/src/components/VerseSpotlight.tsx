import { useState, useEffect } from "react";
import { RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Religion } from "@shared/schema";

interface VerseData {
  faith: Religion;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
}

interface VerseSpotlightProps {
  onNavigateToVerse?: (religion: Religion, book: string, chapter: number, verse?: number) => void;
}

export function VerseSpotlight({ onNavigateToVerse }: VerseSpotlightProps) {
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [insight, setInsight] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [location, navigate] = useLocation();

  // Auto-refresh progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Auto-refresh when progress reaches 100%
          fetchRandomVerse();
          return 0;
        }
        return prev + (100 / 60); // 60 seconds = 100%
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [verse]); // Add verse dependency to prevent infinite calls

  const fetchRandomVerse = async () => {
    try {
      setIsLoading(true);
      setIsRefreshing(true);
      
      // Fetch random verse
      const verseResponse = await fetch("/api/verse/random", {
        method: "GET",
        credentials: "include"
      });
      
      if (!verseResponse.ok) {
        throw new Error(`Failed to fetch verse: ${verseResponse.status}`);
      }
      
      const verseData = await verseResponse.json();
      console.log("Fetched verse:", verseData);
      setVerse(verseData);
      
      // Fetch AI insight
      const insightResponse = await fetch("/api/scholar/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reference: verseData.reference,
          text: verseData.text,
          faith: verseData.faith
        })
      });
      
      if (!insightResponse.ok) {
        throw new Error(`Failed to fetch insight: ${insightResponse.status}`);
      }
      
      const insightData = await insightResponse.json();
      console.log("Fetched insight:", insightData);
      
      setInsight(insightData.insight);
      setProgress(0); // Reset progress bar
    } catch (error) {
      console.error("Error fetching verse:", error);
      
      // Fallback verse on error
      const fallbackVerses = [
        {
          faith: "bible" as Religion,
          book: "Matthew",
          chapter: 5,
          verse: 9,
          text: "Blessed are the peacemakers, for they will be called children of God.",
          reference: "Matthew 5:9"
        },
        {
          faith: "quran" as Religion,
          book: "Al-Baqarah",
          chapter: 2,
          verse: 255,
          text: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.",
          reference: "Al-Baqarah 2:255"
        },
        {
          faith: "torah" as Religion,
          book: "Leviticus",
          chapter: 19,
          verse: 18,
          text: "Do not seek revenge or bear a grudge against anyone among your people, but love your neighbor as yourself.",
          reference: "Leviticus 19:18"
        },
        {
          faith: "hindu" as Religion,
          book: "Bhagavad Gita",
          chapter: 2,
          verse: 47,
          text: "You have a right to perform your prescribed duty, but not to the fruits of action.",
          reference: "Bhagavad Gita 2:47"
        },
        {
          faith: "buddhist" as Religion,
          book: "Tripitaka",
          chapter: 1,
          verse: 1,
          text: "All conditioned things are impermanent. Work out your salvation with diligence.",
          reference: "Tripitaka 1:1"
        }
      ];
      
      const randomFallback = fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)];
      setVerse(randomFallback);
      setInsight(`This verse from ${randomFallback.faith} tradition highlights the importance of spiritual wisdom and ethical living, encouraging us to seek deeper understanding and compassionate action.`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setProgress(0);
    fetchRandomVerse();
  };

  const handleLearnMore = () => {
    if (verse && onNavigateToVerse) {
      onNavigateToVerse(verse.faith, verse.book, verse.chapter, verse.verse);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRandomVerse();
  }, []);

  if (isLoading && !verse) {
    return (
      <div className="max-w-md mx-auto p-6 bg-slate-800 rounded-xl shadow-lg animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-32 mx-auto mb-4"></div>
        <div className="h-6 bg-slate-700 rounded w-48 mx-auto mb-4"></div>
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-slate-700 rounded w-5/6"></div>
        </div>
        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-800 rounded-xl shadow-lg text-white transition-opacity duration-200 opacity-100 relative">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white">
          VERSE SPOTLIGHT
        </h2>
      </div>

      {verse && (
        <>
          {/* Reference */}
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-white">
              {verse.reference}
            </h3>
          </div>

          {/* Verse Text */}
          <div className="mb-4">
            <p className="text-lg leading-relaxed text-white">
              "{verse.text}"
            </p>
          </div>

          {/* AI Insight */}
          <div className="mb-6">
            <p className="text-md text-cyan-400 italic">
              {insight}
            </p>
          </div>

          {/* Learn More Link */}
          <div className="text-center mb-4">
            <button
              onClick={handleLearnMore}
              className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200 text-sm flex items-center justify-center gap-1 mx-auto"
            >
              Read full chapter <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-10 h-10 rounded-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-slate-800 transition-all duration-200 transform hover:scale-110 p-0 flex items-center justify-center"
          title="Refresh verse"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>

        {/* Progress Bar */}
        <div className="flex-1 mx-4">
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-xs text-gray-400 min-w-0">
          {Math.ceil((100 - progress) * 0.6)}s
        </div>
      </div>
    </div>
  );
}