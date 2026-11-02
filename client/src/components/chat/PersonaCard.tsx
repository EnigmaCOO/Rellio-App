import { cn } from "@/lib/utils";
import type { ScholarPersona } from "./ScholarPersonas";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "interrupted";
type Mood = "calm" | "curious" | "focused" | "celebratory" | "reflective";

interface PersonaCardProps {
  persona: ScholarPersona;
  voiceState: VoiceState;
  mood: Mood;
  transcript?: string;
  energy?: number;
  className?: string;
}

const MOOD_LABELS: Record<Mood, string> = {
  calm: "At rest",
  curious: "Curious",
  focused: "Focused",
  celebratory: "Inspired",
  reflective: "Reflecting",
};

const VOICE_STATE_LABELS: Record<VoiceState, string> = {
  idle: "Available",
  listening: "Listening…",
  processing: "Thinking…",
  speaking: "Speaking",
  interrupted: "Paused",
};

export function PersonaCard({
  persona,
  voiceState,
  mood,
  transcript,
  className,
}: PersonaCardProps) {
  const Icon = persona.icon;
  const statusLabel = VOICE_STATE_LABELS[voiceState];
  const moodLabel = MOOD_LABELS[mood];

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl",
        "bg-white border border-gray-200",
        className
      )}
    >
      <div className="relative flex items-center gap-4 px-4 py-4">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
            <Icon className="h-6 w-6 text-gray-600" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">{persona.name}</p>
            <span
              className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400"
            />
          </div>
          <p className="truncate text-[11px] uppercase tracking-wide text-gray-500">
            {persona.title}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200"
            >
              {statusLabel}
            </span>
            <span className="text-[10px] text-gray-500">{moodLabel}</span>
          </div>
        </div>
      </div>

      {transcript && transcript.trim().length > 0 ? (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
          <p className="line-clamp-2 text-[11px] leading-snug text-gray-600">
            {transcript}
          </p>
        </div>
      ) : (
        <div className="border-t border-gray-100 px-4 pb-3 pt-1">
          <p className="line-clamp-1 text-[11px] text-gray-500">{persona.description}</p>
        </div>
      )}
    </div>
  );
}
