import { useState, useEffect } from "react";

interface StreakBadgeProps {
  className?: string;
}

export function StreakBadge({ className = "" }: StreakBadgeProps) {
  const [streakDays, setStreakDays] = useState<number>(1);

  useEffect(() => {
    // Get streak from localStorage or default to 1
    const savedStreak = localStorage.getItem('rellio-streak');
    if (savedStreak) {
      setStreakDays(parseInt(savedStreak, 10));
    }
  }, []);

  return (
    <div className={`inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      <span>Day {streakDays} Streak</span>
      <span>🔥</span>
    </div>
  );
}