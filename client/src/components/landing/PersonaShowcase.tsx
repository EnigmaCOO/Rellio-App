import { useMemo, useState } from "react";
import { MessageCircle, Sparkles, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PersonaPreview = {
  id: string;
  name: string;
  title: string;
  description: string;
  accent: string;
  glow: string;
  voicePrompt?: string;
  route: string;
  livePreview?: React.ReactNode;
};

type PersonaShowcaseProps = {
  personas: PersonaPreview[];
  onNavigate: (route: string) => void;
  onVoicePrompt?: (prompt: string, meta: { personaId: string }) => void;
};

export function PersonaShowcase({ personas, onNavigate, onVoicePrompt }: PersonaShowcaseProps) {
  const [activeId, setActiveId] = useState<string | undefined>(() => personas[0]?.id);

  const activePersona = useMemo(() => {
    return personas.find((persona) => persona.id === activeId) ?? personas[0];
  }, [activeId, personas]);

  if (!activePersona) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">
            Persona previews
          </p>
          <h3 className="mt-1 font-serif text-2xl text-gray-900 sm:text-3xl">
            Meet your sacred guides
          </h3>
        </div>
        <MessageCircle className="hidden h-8 w-8 text-gray-400 md:block" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.35em] text-gray-500">
                  {activePersona.title}
                </p>
                <h4 className="font-serif text-3xl text-gray-900 sm:text-4xl">
                  {activePersona.name}
                </h4>
              </div>
              {activePersona.voicePrompt && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  onClick={() => onVoicePrompt?.(activePersona.voicePrompt ?? "", { personaId: activePersona.id })}
                >
                  <Volume2 className="h-4 w-4" />
                  Voice prompt
                </Button>
              )}
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-gray-600">
              {activePersona.description}
            </p>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">
                <Sparkles className="h-3.5 w-3.5" />
                Live insight
              </div>
              {activePersona.livePreview ?? (
                <p className="text-sm leading-relaxed text-gray-600">
                  This persona is preparing a live preview of reflective dialogue.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                className="w-full sm:w-auto bg-gray-900 text-white hover:bg-gray-700"
                onClick={() => onNavigate(activePersona.route)}
              >
                Enter {activePersona.name}'s space
              </Button>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-500">
                Connect instantly in the Universal Wisdom Explorer
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {personas.map((persona) => {
            const isActive = persona.id === activePersona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => setActiveId(persona.id)}
                className={cn(
                  "group rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400",
                  isActive
                    ? "border-gray-400 bg-gray-100 text-gray-900 shadow-sm"
                    : "text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">
                  {persona.title}
                </p>
                <p className="mt-2 font-serif text-xl text-gray-900">{persona.name}</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  {persona.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
