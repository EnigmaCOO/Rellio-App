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
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

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

export function ProgressDashboard() {
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

  if (journeyLoading || summaryLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="glass-card border-cosmic-purple/30">
              <CardContent className="p-6">
                <div className="h-16 bg-cosmic-purple/10 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const weeklyProgress = calculateWeeklyProgress();

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8 text-cosmic-gold" />
          Spiritual Journey Progress
        </h1>
        <p className="text-slate-300">Track your spiritual growth and reading milestones</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sessions */}
        <Card className="glass-card border-cosmic-purple/30 hover:border-cosmic-purple/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Total Sessions</p>
                <p className="text-2xl font-bold text-white">{summary?.totalSessions || 0}</p>
              </div>
              <BookOpen className="w-8 h-8 text-cosmic-purple" />
            </div>
          </CardContent>
        </Card>

        {/* Total Time */}
        <Card className="glass-card border-cosmic-blue/30 hover:border-cosmic-blue/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Time Spent</p>
                <p className="text-2xl font-bold text-white">{formatDuration(summary?.totalMinutes || 0)}</p>
              </div>
              <Clock className="w-8 h-8 text-cosmic-blue" />
            </div>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card className="glass-card border-cosmic-gold/30 hover:border-cosmic-gold/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Current Streak</p>
                <p className="text-2xl font-bold text-white flex items-center gap-1">
                  {summary?.currentStreak || 0}
                  <span className="text-lg">{getStreakEmoji(summary?.currentStreak || 0)}</span>
                </p>
              </div>
              <Flame className="w-8 h-8 text-cosmic-gold" />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Goal Progress */}
        <Card className="glass-card border-neon-cyan/30 hover:border-neon-cyan/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300">Weekly Goal</p>
                <Target className="w-8 h-8 text-neon-cyan" />
              </div>
              <div className="space-y-2">
                <Progress value={Math.min(weeklyProgress, 100)} className="h-2" />
                <p className="text-xs text-slate-400">
                  {Math.round(weeklyProgress)}% of {formatDuration(journey?.readingGoal || 0)} goal
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 glass-card border-cosmic-purple/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Reading Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {sessions?.slice(0, 10).map((session, index) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-cosmic-purple/50 text-cosmic-purple">
                          {religionDisplayNames[session.religion] || session.religion}
                        </Badge>
                        <span className="text-sm text-slate-300">{session.book} Ch.{session.chapter}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDate(session.startTime)} • {formatDuration(session.durationMinutes)}
                        {session.completedChapter === 1 && <span className="ml-2">✅ Completed</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{session.versesRead} verses</p>
                      {session.chatMessages > 0 && (
                        <p className="text-xs text-slate-400">{session.chatMessages} chat messages</p>
                      )}
                    </div>
                  </div>
                ))}
                {(!sessions || sessions.length === 0) && (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No reading sessions yet</p>
                    <p className="text-sm">Start reading to see your progress here</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Achievements & Stats */}
        <div className="space-y-6">
          {/* Religions Explored */}
          <Card className="glass-card border-cosmic-gold/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Star className="w-5 h-5" />
                Religions Explored
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summary?.religionsExplored?.length ? (
                  summary.religionsExplored.map((religion) => (
                    <Badge 
                      key={religion} 
                      variant="outline" 
                      className="border-cosmic-gold/50 text-cosmic-gold mr-2 mb-2"
                    >
                      {religionDisplayNames[religion] || religion}
                    </Badge>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">Start reading to explore different traditions</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Milestones */}
          <Card className="glass-card border-neon-cyan/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="w-5 h-5" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {summary?.recentMilestones?.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
                      <span className="text-2xl">{milestone.badge}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{milestone.title}</p>
                        <p className="text-xs text-slate-400">{milestone.description}</p>
                        <p className="text-xs text-slate-500">{formatDate(milestone.achievedAt)}</p>
                      </div>
                    </div>
                  ))}
                  {(!summary?.recentMilestones || summary.recentMilestones.length === 0) && (
                    <div className="text-center py-6 text-slate-400">
                      <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No achievements yet</p>
                      <p className="text-xs">Keep reading to unlock milestones</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="glass-card border-cosmic-purple/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Journey Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-300">Journey Started</span>
                <span className="text-sm text-white">{journey?.startDate ? formatDate(journey.startDate) : 'N/A'}</span>
              </div>
              <Separator className="bg-slate-700" />
              <div className="flex justify-between">
                <span className="text-sm text-slate-300">Longest Streak</span>
                <span className="text-sm text-white">{summary?.longestStreak || 0} days</span>
              </div>
              <Separator className="bg-slate-700" />
              <div className="flex justify-between">
                <span className="text-sm text-slate-300">Favorite Tradition</span>
                <span className="text-sm text-white">
                  {journey?.favoriteReligion ? 
                    religionDisplayNames[journey.favoriteReligion] || journey.favoriteReligion : 
                    'Exploring'}
                </span>
              </div>
              <Separator className="bg-slate-700" />
              <div className="flex justify-between">
                <span className="text-sm text-slate-300">Weekly Goal</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-1 text-neon-cyan hover:text-neon-cyan hover:bg-neon-cyan/10"
                  onClick={() => {
                    const newGoal = prompt('Set weekly reading goal (minutes):', journey?.readingGoal?.toString());
                    if (newGoal && !isNaN(parseInt(newGoal))) {
                      updateGoalMutation.mutate(parseInt(newGoal));
                    }
                  }}
                >
                  {formatDuration(journey?.readingGoal || 0)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}