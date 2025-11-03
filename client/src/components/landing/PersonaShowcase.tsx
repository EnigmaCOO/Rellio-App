import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const shouldReduceMotion = useReducedMotion();
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
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-yellow-200/80">
            Persona previews
          </p>
          <h3 className="mt-1 font-serif text-2xl text-yellow-100 sm:text-3xl">
            Meet your sacred guides
          </h3>
        </div>
        <MessageCircle className="hidden h-8 w-8 text-yellow-200/60 md:block" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePersona.id}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
            className={cn(
              "relative overflow-hidden rounded-3xl border border-yellow-200/30 bg-black/60 p-6 sm:p-8",
              activePersona.glow
            )}
            style={{
              backgroundImage: `linear-gradient(140deg, rgba(255, 215, 0, 0.12), rgba(0, 0, 0, 0.4)), linear-gradient(180deg, ${activePersona.accent})`,
            }}
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.35em] text-yellow-100/70">
                    {activePersona.title}
                  </p>
                  <h4 className="font-serif text-3xl text-yellow-50 sm:text-4xl">
                    {activePersona.name}
                  </h4>
                </div>
                {activePersona.voicePrompt && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-yellow-200/40 bg-yellow-200/10 text-yellow-100 hover:bg-yellow-200/20"
                    onClick={() => onVoicePrompt?.(activePersona.voicePrompt ?? "", { personaId: activePersona.id })}
                  >
                    <Volume2 className="h-4 w-4" />
                    Voice prompt
                  </Button>
                )}
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-yellow-100/80">
                {activePersona.description}
              </p>

              <div className="rounded-2xl border border-yellow-200/20 bg-black/40 p-6">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-yellow-200/70">
                  <Sparkles className="h-3.5 w-3.5" />
                  Live insight
                </div>
                {activePersona.livePreview ?? (
                  <p className="text-sm leading-relaxed text-yellow-100/75">
                    This persona is preparing a live preview of reflective dialogue.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  className="w-full sm:w-auto bg-yellow-300/80 text-black hover:bg-yellow-300"
                  onClick={() => onNavigate(activePersona.route)}
                >
                  Enter {activePersona.name}'s space
                </Button>
                <p className="text-xs uppercase tracking-[0.35em] text-yellow-100/60">
                  Connect instantly in the Universal Wisdom Explorer
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="grid gap-3 sm:grid-cols-2">
          {personas.map((persona) => {
            const isActive = persona.id === activePersona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => setActiveId(persona.id)}
                className={cn(
                  "group rounded-2xl border border-yellow-200/20 bg-black/40 p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/80",
                  isActive
                    ? "border-yellow-200/60 bg-yellow-200/5 text-yellow-100 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                    : "text-yellow-100/75 hover:border-yellow-200/40 hover:bg-yellow-200/5"
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-yellow-100/70">
                  {persona.title}
                </p>
                <p className="mt-2 font-serif text-xl text-yellow-50">{persona.name}</p>
                <p className="mt-3 text-sm leading-relaxed text-yellow-100/70">
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

