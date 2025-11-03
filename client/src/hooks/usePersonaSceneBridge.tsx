import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ScholarPersona } from "@/components/chat/ScholarPersonas";
import type { Religion } from "@shared/schema";

type PersonaPose = "idle" | "listening" | "speaking" | "processing" | "interrupted" | "celebrating";
type PersonaVoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted";

export interface ActiveVerseInfo {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  religion: Religion | null;
}

interface PersonaSceneEvent {
  type: "voice" | "message" | "verse" | "interruption";
  timestamp: number;
  energy: number;
  label?: string;
  textSnippet?: string;
  speaker?: "ai" | "user";
}

interface PersonaSceneContextValue {
  persona: ScholarPersona | null;
  personaPose: PersonaPose;
  voiceState: PersonaVoiceState;
  transcript: string;
  lastStatement: string;
  energy: number;
  mood: "calm" | "curious" | "focused" | "celebratory" | "reflective";
  activeVerse: ActiveVerseInfo | null;
  recentEvents: PersonaSceneEvent[];
  setPersona: (persona: ScholarPersona | null) => void;
  triggerPose: (pose: PersonaPose, options?: { energy?: number; textSnippet?: string; speaker?: "ai" | "user" }) => void;
  syncVoiceState: (state: PersonaVoiceState) => void;
  syncTranscript: (text: string, options?: { isInterim?: boolean; speaker?: "ai" | "user" }) => void;
  pushChatEvent: (event: { type: "user" | "ai" | "system"; text?: string; energy?: number }) => void;
  setActiveVerse: (verse: ActiveVerseInfo | null) => void;
}

const PersonaSceneContext = createContext<PersonaSceneContextValue | undefined>(undefined);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const deriveMood = (pose: PersonaPose, energy: number, voice: PersonaVoiceState, verse: ActiveVerseInfo | null): PersonaSceneContextValue["mood"] => {
  if (pose === "speaking" || voice === "speaking") {
    return "focused";
  }
  if (pose === "celebrating" || energy > 0.75) {
    return "celebratory";
  }
  if (verse) {
    return "reflective";
  }
  if (voice === "listening") {
    return "curious";
  }
  return "calm";
};

export function PersonaSceneProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<ScholarPersona | null>(null);
  const [personaPose, setPersonaPose] = useState<PersonaPose>("idle");
  const [voiceState, setVoiceState] = useState<PersonaVoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastStatement, setLastStatement] = useState("");
  const [energy, setEnergy] = useState(0.18);
  const [activeVerse, setActiveVerseState] = useState<ActiveVerseInfo | null>(null);
  const [recentEvents, setRecentEvents] = useState<PersonaSceneEvent[]>([]);

  const energyTargetRef = useRef(0.2);
  const lastVerseKeyRef = useRef<string | null>(null);

  const registerEvent = useCallback((event: PersonaSceneEvent) => {
    setRecentEvents((previous) => {
      const next = previous.filter((entry) => event.timestamp - entry.timestamp < 6000);
      next.push(event);
      return next;
    });
    energyTargetRef.current = clamp(energyTargetRef.current + event.energy, 0.05, 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let animationFrame: number;
    const step = () => {
      setEnergy((current) => {
        const target = energyTargetRef.current;
        const next = current + (target - current) * 0.1;
        energyTargetRef.current = clamp(target - 0.015, 0.05, 1);
        return clamp(next, 0.05, 1);
      });

      animationFrame = window.requestAnimationFrame(step);
    };

    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  const triggerPose = useCallback((pose: PersonaPose, options?: { energy?: number; textSnippet?: string; speaker?: "ai" | "user" }) => {
    setPersonaPose(pose);
    if (options?.energy) {
      energyTargetRef.current = clamp(energyTargetRef.current + options.energy, 0.05, 1);
    }
    registerEvent({
      type: pose === "speaking" ? "voice" : pose === "celebrating" ? "message" : pose === "interrupted" ? "interruption" : "verse",
      timestamp: Date.now(),
      energy: options?.energy ?? 0.08,
      textSnippet: options?.textSnippet,
      speaker: options?.speaker,
      label: pose,
    });
  }, [registerEvent]);

  const syncVoiceState = useCallback((state: PersonaVoiceState) => {
    setVoiceState(state);
    if (state === "speaking") {
      triggerPose("speaking", { energy: 0.22, speaker: "ai" });
    } else if (state === "listening") {
      triggerPose("listening", { energy: 0.12, speaker: "user" });
    } else if (state === "interrupted") {
      registerEvent({
        type: "interruption",
        timestamp: Date.now(),
        energy: 0.18,
        label: "interrupted",
      });
    }
  }, [triggerPose, registerEvent]);

  const syncTranscript = useCallback((text: string, options?: { isInterim?: boolean; speaker?: "ai" | "user" }) => {
    setTranscript(text);
    if (!options?.isInterim && text.trim().length > 0) {
      setLastStatement(text);
      registerEvent({
        type: "voice",
        timestamp: Date.now(),
        energy: options?.speaker === "ai" ? 0.24 : 0.16,
        textSnippet: text.slice(0, 140),
        speaker: options?.speaker,
      });
    }
  }, [registerEvent]);

  const pushChatEvent = useCallback((event: { type: "user" | "ai" | "system"; text?: string; energy?: number }) => {
    registerEvent({
      type: "message",
      timestamp: Date.now(),
      energy: event.energy ?? (event.type === "ai" ? 0.25 : event.type === "user" ? 0.18 : 0.12),
      textSnippet: event.text?.slice(0, 160),
      speaker: event.type === "ai" ? "ai" : event.type === "user" ? "user" : undefined,
    });
    if (event.type === "ai") {
      setLastStatement(event.text ?? "");
    }
  }, [registerEvent]);

  const setPersona = useCallback((nextPersona: ScholarPersona | null) => {
    setPersonaState(nextPersona);
    if (nextPersona) {
      registerEvent({
        type: "message",
        timestamp: Date.now(),
        energy: 0.2,
        label: "persona-change",
        textSnippet: nextPersona.name,
      });
      triggerPose("celebrating", { energy: 0.3, textSnippet: nextPersona.name });
    } else {
      setPersonaPose("idle");
    }
  }, [registerEvent, triggerPose]);

  const setActiveVerse = useCallback((verse: ActiveVerseInfo | null) => {
    if (!verse) {
      if (lastVerseKeyRef.current !== null) {
        lastVerseKeyRef.current = null;
        setActiveVerseState(null);
      }
      return;
    }

    const verseKey = `${verse.religion ?? "universal"}-${verse.book}-${verse.chapter}-${verse.verse}`;
    if (lastVerseKeyRef.current === verseKey) {
      return;
    }

    lastVerseKeyRef.current = verseKey;
    setActiveVerseState(verse);
    triggerPose("listening", { energy: 0.16, textSnippet: verse.text.slice(0, 120) });
    registerEvent({
      type: "verse",
      timestamp: Date.now(),
      energy: 0.14,
      label: `${verse.book} ${verse.chapter}:${verse.verse}`,
      textSnippet: verse.text.slice(0, 120),
    });
  }, [registerEvent, triggerPose]);

  const mood = useMemo(
    () => deriveMood(personaPose, energy, voiceState, activeVerse),
    [personaPose, energy, voiceState, activeVerse]
  );

  const value = useMemo<PersonaSceneContextValue>(() => ({
    persona,
    personaPose,
    voiceState,
    transcript,
    lastStatement,
    energy,
    mood,
    activeVerse,
    recentEvents,
    setPersona,
    triggerPose,
    syncVoiceState,
    syncTranscript,
    pushChatEvent,
    setActiveVerse,
  }), [persona, personaPose, voiceState, transcript, lastStatement, energy, mood, activeVerse, recentEvents, setPersona, triggerPose, syncVoiceState, syncTranscript, pushChatEvent, setActiveVerse]);

  return (
    <PersonaSceneContext.Provider value={value}>
      {children}
    </PersonaSceneContext.Provider>
  );
}

export function usePersonaSceneBridge() {
  const context = useContext(PersonaSceneContext);
  if (!context) {
    throw new Error("usePersonaSceneBridge must be used within a PersonaSceneProvider");
  }
  return context;
}

