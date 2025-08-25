import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Religion } from '@shared/schema';

interface ReadingSessionState {
  sessionId: number | null;
  startTime: Date | null;
  religion: Religion | null;
  book: string | null;
  chapter: number | null;
  versesRead: number;
  chatMessages: number;
}

export function useReadingSession() {
  const [session, setSession] = useState<ReadingSessionState>({
    sessionId: null,
    startTime: null,
    religion: null,
    book: null,
    chapter: null,
    versesRead: 0,
    chatMessages: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const startSessionMutation = useMutation({
    mutationFn: async (data: { religion: Religion; book: string; chapter: number }) => {
      const response = await fetch('/api/progress/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to start session');
      return response.json();
    },
    onSuccess: (data) => {
      setSession(prev => ({
        ...prev,
        sessionId: data.id,
        startTime: new Date(),
        religion: data.religion,
        book: data.book,
        chapter: data.chapter,
        versesRead: 0,
        chatMessages: 0
      }));
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async (data: {
      sessionId: number;
      durationMinutes: number;
      versesRead: number;
      chatMessages: number;
      completedChapter?: boolean;
    }) => {
      const response = await fetch(`/api/progress/session/${data.sessionId}/end`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes: data.durationMinutes,
          versesRead: data.versesRead,
          chatMessages: data.chatMessages,
          completedChapter: data.completedChapter || false
        })
      });
      if (!response.ok) throw new Error('Failed to end session');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate progress queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/progress/journey'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress/milestones'] });
      
      setSession({
        sessionId: null,
        startTime: null,
        religion: null,
        book: null,
        chapter: null,
        versesRead: 0,
        chatMessages: 0
      });
    },
  });

  const startSession = (religion: Religion, book: string, chapter: number) => {
    // End any existing session first
    if (session.sessionId && session.startTime) {
      const duration = Math.round((Date.now() - session.startTime.getTime()) / 60000);
      endSessionMutation.mutate({
        sessionId: session.sessionId,
        durationMinutes: duration,
        versesRead: session.versesRead,
        chatMessages: session.chatMessages,
      });
    }

    // Start new session
    startSessionMutation.mutate({ religion, book, chapter });
  };

  const endSession = (completedChapter = false) => {
    if (session.sessionId && session.startTime) {
      const duration = Math.round((Date.now() - session.startTime.getTime()) / 60000);
      endSessionMutation.mutate({
        sessionId: session.sessionId,
        durationMinutes: duration,
        versesRead: session.versesRead,
        chatMessages: session.chatMessages,
        completedChapter
      });
    }
  };

  const incrementVersesRead = (count = 1) => {
    setSession(prev => ({
      ...prev,
      versesRead: prev.versesRead + count
    }));
  };

  const incrementChatMessages = (count = 1) => {
    setSession(prev => ({
      ...prev,
      chatMessages: prev.chatMessages + count
    }));
  };

  const updateChapter = (newChapter: number) => {
    if (session.chapter !== newChapter && session.religion && session.book) {
      // Mark previous chapter as completed if moving to next chapter
      const completedChapter = newChapter > (session.chapter || 0);
      
      if (completedChapter) {
        endSession(true);
        startSession(session.religion, session.book, newChapter);
      } else {
        setSession(prev => ({ ...prev, chapter: newChapter }));
      }
    }
  };

  // Auto-end session after 30 minutes of inactivity
  useEffect(() => {
    if (session.sessionId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        if (session.startTime) {
          const inactiveMinutes = (Date.now() - session.startTime.getTime()) / 60000;
          if (inactiveMinutes > 30) {
            endSession();
          }
        }
      }, 60000); // Check every minute
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session.sessionId, session.startTime]);

  // End session when component unmounts or page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session.sessionId && session.startTime) {
        // Use navigator.sendBeacon for reliable last-minute requests
        const duration = Math.round((Date.now() - session.startTime.getTime()) / 60000);
        const data = {
          sessionId: session.sessionId,
          durationMinutes: duration,
          versesRead: session.versesRead,
          chatMessages: session.chatMessages,
        };
        
        navigator.sendBeacon(
          `/api/progress/session/${session.sessionId}/end`,
          JSON.stringify(data)
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also end session when hook unmounts
      if (session.sessionId && session.startTime) {
        endSession();
      }
    };
  }, [session.sessionId, session.startTime, session.versesRead, session.chatMessages]);

  const getSessionDuration = () => {
    if (!session.startTime) return 0;
    return Math.round((Date.now() - session.startTime.getTime()) / 60000);
  };

  const isSessionActive = () => {
    return session.sessionId !== null && session.startTime !== null;
  };

  return {
    session,
    startSession,
    endSession,
    incrementVersesRead,
    incrementChatMessages,
    updateChapter,
    getSessionDuration,
    isSessionActive,
    isLoading: startSessionMutation.isPending || endSessionMutation.isPending
  };
}