import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Clock, 
  Target, 
  Trophy, 
  TrendingUp, 
  Calendar,
  Star,
  Flame,
  Award,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface ProgressDashboardProps {
  onClose?: () => void;
}

interface SpiritualJourney {
  id: number;
  userId: string;
  startDate: string;
  totalReadingSessions: number;
  totalTimeMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  favoriteReligion: string | null;
  readingGoal: number;
  createdAt: string;
  updatedAt: string;
}

interface ProgressSummary {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  religionsExplored: string[];
  recentMilestones: Array<{
    id: number;
    type: string;
    title: string;
    description: string;
    achievedAt: string;
    value: number;
    badge: string;
  }>;
}

interface ReadingSession {
  id: number;
  userId: string;
  journeyId: number;
  religion: string;
  book: string;
  chapter: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  versesRead: number;
  chatMessages: number;
  completedChapter: number;
  mood: string | null;
  notes: string | null;
  createdAt: string;
}

export function ProgressDashboard({ onClose }: ProgressDashboardProps = {}) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');
  const queryClient = useQueryClient();

  const { data: journey, isLoading: journeyLoading } = useQuery<SpiritualJourney>({
    queryKey: ['/api/progress/journey'],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<ProgressSummary>({
    queryKey: ['/api/progress/summary'],
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<ReadingSession[]>({
    queryKey: ['/api/progress/sessions'],
    staleTime: 30000,
  });

  const { data: milestones } = useQuery({
    queryKey: ['/api/progress/milestones'],
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (readingGoal: number) => {
      const response = await fetch('/api/progress/journey/goal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingGoal })
      });
      if (!response.ok) throw new Error('Failed to update goal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress/journey'] });
    },
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateWeeklyProgress = () => {
    if (!journey) return 0;
    const goalMinutes = journey.readingGoal;
    
    // Calculate this week's minutes from recent sessions
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeekSessions = sessions?.filter(s => 
      new Date(s.startTime) >= oneWeekAgo
    ) || [];
    
    const thisWeekMinutes = thisWeekSessions.reduce((total, session) => 
      total + session.durationMinutes, 0
    );
    
    return goalMinutes > 0 ? (thisWeekMinutes / goalMinutes) * 100 : 0;
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return "🔥";
    if (streak >= 14) return "⚡";
    if (streak >= 7) return "✨";
    if (streak >= 3) return "💫";
    return "🌟";
  };

  const religionDisplayNames: { [key: string]: string } = {
    'christianity': 'Christianity',
    'islam': 'Islam', 
    'judaism': 'Judaism',
    'hinduism': 'Hinduism',
    'buddhism': 'Buddhism'
  };

  const cardStyle = {
    background: "#f9f9f9",
    border: "1px solid #e5e5e5",
  };
  const rowStyle = {
    background: "#f9f9f9",
    border: "1px solid #e5e5e5",
  };

  if (journeyLoading || summaryLoading) {
    return (
      <div className="space-y-6 p-6 min-h-full" style={{ background: "#ffffff" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} style={cardStyle} className="border-0">
              <CardContent className="p-6">
                <div className="h-16 rounded animate-pulse" style={{ background: "#f5f5f5" }}></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const weeklyProgress = calculateWeeklyProgress();

  return (
    <div className="space-y-6 p-4 lg:p-6 min-h-full" style={{ background: "#ffffff" }}>
      {/* Header */}
      <div className="relative">
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-0 right-0 hover:bg-gray-100"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Trophy className="w-7 h-7" style={{ color: "#0a0a0a" }} />
            Spiritual Journey
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Track your growth and reading milestones</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0" style={cardStyle}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Sessions</p>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{summary?.totalSessions || 0}</p>
              </div>
              <BookOpen className="w-7 h-7 opacity-60" style={{ color: "#0a0a0a" }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0" style={cardStyle}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Time Spent</p>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{formatDuration(summary?.totalMinutes || 0)}</p>
              </div>
              <Clock className="w-7 h-7 opacity-60" style={{ color: "#0a0a0a" }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0" style={{ background: "#f5f5f5", border: "1px solid #e5e5e5" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Streak</p>
                <p className="text-2xl font-bold flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                  {summary?.currentStreak || 0}
                  <span className="text-base">{getStreakEmoji(summary?.currentStreak || 0)}</span>
                </p>
              </div>
              <Flame className="w-7 h-7 opacity-70" style={{ color: "#0a0a0a" }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0" style={cardStyle}>
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Weekly Goal</p>
                <Target className="w-5 h-5 opacity-60" style={{ color: "#0a0a0a" }} />
              </div>
              <Progress value={Math.min(weeklyProgress, 100)} className="h-2" style={{ background: "#f5f5f5" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {Math.round(weeklyProgress)}% of {formatDuration(journey?.readingGoal || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-0" style={cardStyle}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "#0a0a0a" }} />
              Recent Reading Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {sessions?.slice(0, 10).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-xl" style={rowStyle}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-0" style={{ background: "#f5f5f5", color: "#0a0a0a" }}>
                          {religionDisplayNames[session.religion] || session.religion}
                        </Badge>
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{session.book} Ch.{session.chapter}</span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {formatDate(session.startTime)} · {formatDuration(session.durationMinutes)}
                        {session.completedChapter === 1 && <span className="ml-2">✅</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{session.versesRead} verses</p>
                      {session.chatMessages > 0 && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{session.chatMessages} chats</p>
                      )}
                    </div>
                  </div>
                ))}
                {(!sessions || sessions.length === 0) && (
                  <div className="text-center py-10">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "#0a0a0a" }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>No reading sessions yet</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-disabled)" }}>Start reading to see your progress here</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Milestones & Stats */}
        <div className="space-y-4">
          {/* Religions Explored */}
          <Card className="border-0" style={cardStyle}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Star className="w-4 h-4" style={{ color: "#0a0a0a" }} />
                Traditions Explored
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summary?.religionsExplored?.length ? (
                  summary.religionsExplored.map((religion) => (
                    <Badge key={religion} variant="outline" className="text-xs border-0" style={{ background: "#f5f5f5", color: "#0a0a0a" }}>
                      {religionDisplayNames[religion] || religion}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Start reading to explore traditions</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Milestones */}
          <Card className="border-0" style={cardStyle}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Award className="w-4 h-4" style={{ color: "#0a0a0a" }} />
                Recent Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {summary?.recentMilestones?.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-3 p-2 rounded-lg" style={rowStyle}>
                      <span className="text-xl">{milestone.badge}</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{milestone.title}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{milestone.description}</p>
                      </div>
                    </div>
                  ))}
                  {(!summary?.recentMilestones || summary.recentMilestones.length === 0) && (
                    <div className="text-center py-6">
                      <Trophy className="w-7 h-7 mx-auto mb-2 opacity-30" style={{ color: "#0a0a0a" }} />
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Keep reading to unlock milestones</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Journey Stats */}
          <Card className="border-0" style={cardStyle}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Calendar className="w-4 h-4" style={{ color: "#0a0a0a" }} />
                Journey Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Journey Started", value: journey?.startDate ? formatDate(journey.startDate) : 'N/A' },
                { label: "Longest Streak", value: `${summary?.longestStreak || 0} days` },
                { label: "Favorite Tradition", value: journey?.favoriteReligion ? (religionDisplayNames[journey.favoriteReligion] || journey.favoriteReligion) : 'Exploring' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{value}</span>
                  </div>
                  <Separator style={{ background: "#e5e5e5" }} />
                </div>
              ))}
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Weekly Goal</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs hover:bg-gray-100"
                  style={{ color: "#0a0a0a" }}
                  onClick={() => {
                    const newGoal = prompt('Set weekly reading goal (minutes):', journey?.readingGoal?.toString());
                    if (newGoal && !isNaN(parseInt(newGoal))) {
                      updateGoalMutation.mutate(parseInt(newGoal));
                    }
                  }}
                >
                  {formatDuration(journey?.readingGoal || 0)} ✎
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}