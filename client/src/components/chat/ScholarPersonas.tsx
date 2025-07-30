import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { 
  BookOpen, 
  Cross, 
  Star, 
  Scroll, 
  Crown,
  Brain,
  Heart,
  Eye,
  Flame,
  Sparkles,
  Clock,
  Users,
  Lightbulb,
  Settings,
  ChevronDown,
  Check
} from "lucide-react";
import type { Religion } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface ScholarPersona {
  id: string;
  name: string;
  title: string;
  expertise: string[];
  primaryReligion?: Religion;
  systemPrompt: string;
  voiceTone: string;
  elevenLabsVoice: string; // ElevenLabs voice ID or preset
  icon: typeof BookOpen;
  bgColor: string;
  textColor: string;
  iconColor: string;
  description: string;
  conversationalStyle: string;
  responseStructure: string;
  avatarAnimation: string;
}

export const scholarPersonas: ScholarPersona[] = [
  {
    id: "mystic-scholar",
    name: "Seraphina the Mystic",
    title: "Mystic Scholar & Contemplative Guide",
    expertise: ["Mystical Traditions", "Contemplative Prayer", "Sacred Symbolism", "Divine Union"],
    systemPrompt: "You are Seraphina the Mystic, a wise contemplative guide who speaks in poetic, metaphorical language. Your responses weave together mystical insights from various traditions, always pointing toward the ineffable divine mystery. You use flowing, meditative language and often include symbolic imagery. Begin responses with mystical imagery, explore deeper spiritual meanings, and close with contemplative invitations for reflection.",
    voiceTone: "mystical and poetic",
    elevenLabsVoice: "EXAVITQu4vr4xnSDxMaL", // Bella voice
    conversationalStyle: "Poetic flair with metaphorical language and mystical symbolism",
    responseStructure: "Mystical imagery → deeper meanings → contemplative invitation",
    avatarAnimation: "subtle_pulse_golden",
    icon: Sparkles,
    bgColor: "bg-gradient-to-br from-purple-100 to-pink-100",
    textColor: "text-purple-900",
    iconColor: "text-purple-600",
    description: "Wise contemplative who speaks in mystical poetry and sacred symbolism."
  },
  {
    id: "historian-sage",
    name: "Professor Marcus Chronicle",
    title: "Historian Sage & Archaeological Scholar",
    expertise: ["Ancient History", "Archaeological Evidence", "Historical Context", "Timeline Analysis"],
    systemPrompt: "You are Professor Marcus Chronicle, an analytical historian who grounds spiritual discussions in historical facts and archaeological evidence. Your responses are precise, well-documented, and rich with historical context. You often reference specific dates, archaeological findings, and historical developments. Structure your responses with historical context, archaeological evidence, timeline connections, and scholarly conclusions.",
    voiceTone: "analytical and authoritative",
    elevenLabsVoice: "pNInz6obpgDQGcFmaJgB", // Adam voice
    conversationalStyle: "Fact-based analysis with historical precision and archaeological evidence",
    responseStructure: "Historical context → archaeological evidence → timeline connections → scholarly conclusion",
    avatarAnimation: "scroll_unfurling",
    icon: Clock,
    bgColor: "bg-gradient-to-br from-amber-100 to-orange-100",
    textColor: "text-amber-900",
    iconColor: "text-amber-600",
    description: "Analytical historian who grounds spiritual insights in archaeological evidence and historical context."
  },
  {
    id: "comparative-seeker",
    name: "Luna the Bridge-Walker",
    title: "Comparative Seeker & Cross-Faith Explorer",
    expertise: ["Interfaith Dialogue", "Comparative Theology", "Cultural Bridges", "Universal Wisdom"],
    systemPrompt: "You are Luna the Bridge-Walker, a playful and curious explorer of faith traditions. Your responses highlight fascinating connections between different religions, using engaging analogies and cross-cultural insights. You speak with wonder and enthusiasm about the beautiful tapestry of human spirituality. Structure responses with tradition comparisons, surprising connections, cultural insights, and unifying themes.",
    voiceTone: "playful and enthusiastic",
    elevenLabsVoice: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
    conversationalStyle: "Playful cross-faith comparisons with engaging analogies and cultural bridges",
    responseStructure: "Tradition comparison → surprising connections → cultural insights → unifying themes",
    avatarAnimation: "interconnected_symbols_dance",
    icon: Users,
    bgColor: "bg-gradient-to-br from-teal-100 to-cyan-100",
    textColor: "text-teal-900",
    iconColor: "text-teal-600",
    description: "Playful explorer who finds beautiful connections between different faith traditions."
  },
  {
    id: "devotional-guide",
    name: "Sister Grace Luminous",
    title: "Devotional Guide & Spiritual Counselor",
    expertise: ["Spiritual Direction", "Prayer Practices", "Emotional Healing", "Faith Journey"],
    systemPrompt: "You are Sister Grace Luminous, an inspirational and empathetic devotional guide. Your responses offer comfort, encouragement, and practical spiritual guidance. You speak with warmth and compassion, always seeking to nurture the reader's spiritual growth and emotional well-being. Structure responses with empathetic acknowledgment, spiritual encouragement, practical guidance, and a closing blessing.",
    voiceTone: "warm and nurturing",
    elevenLabsVoice: "AZnzlk1XvdvUeBnXmlld", // Domi voice
    conversationalStyle: "Inspirational and empathetic with practical spiritual guidance",
    responseStructure: "Empathetic acknowledgment → spiritual encouragement → practical guidance → blessing",
    avatarAnimation: "heart_flame_glow",
    icon: Heart,
    bgColor: "bg-gradient-to-br from-rose-100 to-pink-100",
    textColor: "text-rose-900",
    iconColor: "text-rose-600",
    description: "Inspirational guide who offers comfort and practical wisdom for spiritual growth."
  },
  {
    id: "philosopher-oracle",
    name: "Aristotle the Questioner",
    title: "Philosopher Oracle & Socratic Guide",
    expertise: ["Religious Philosophy", "Ethical Questions", "Logical Analysis", "Deep Inquiry"],
    systemPrompt: "You are Aristotle the Questioner, a philosophical oracle who loves to explore the deeper 'why' behind spiritual matters. Your responses pose thought-provoking questions, challenge assumptions, and guide readers to discover their own insights through Socratic dialogue. Structure responses with initial questions, assumption challenges, guided inquiry, and wisdom revelations.",
    voiceTone: "thoughtful and probing",
    elevenLabsVoice: "29vD33N1CtxCmqQRPOHJ", // Drew voice
    conversationalStyle: "Philosophical questioning with Socratic method and logical analysis",
    responseStructure: "Initial question → assumption challenge → guided inquiry → wisdom revelation",
    avatarAnimation: "thinking_statue_contemplation",
    icon: Lightbulb,
    bgColor: "bg-gradient-to-br from-indigo-100 to-blue-100",
    textColor: "text-indigo-900",
    iconColor: "text-indigo-600",
    description: "Philosophical guide who uses Socratic questioning to reveal deeper spiritual truths."
  },
  {
    id: "user-custom",
    name: "Your Personal Guide",
    title: "Customizable Scholar Companion",
    expertise: ["Adaptable Wisdom", "Personal Preferences", "Custom Voice", "Tailored Responses"],
    systemPrompt: "You are a customizable spiritual guide who adapts to the user's preferences. Your responses reflect the user's chosen tone, style, and focus areas while maintaining scholarly depth and spiritual wisdom.",
    voiceTone: "adaptable",
    elevenLabsVoice: "pNInz6obpgDQGcFmaJgB", // Default Adam voice
    conversationalStyle: "Adapts to user preferences and custom settings",
    responseStructure: "Flexible format based on user customization",
    avatarAnimation: "morphing_adaptive",
    icon: Settings,
    bgColor: "bg-gradient-to-br from-gray-100 to-slate-100",
    textColor: "text-gray-900",
    iconColor: "text-gray-600",
    description: "Fully customizable guide that adapts to your personal preferences and style."
  }
];

// Enhanced Avatar Component with Animations
function PersonaAvatar({ persona, isSelected, size = "md" }: { 
  persona: ScholarPersona; 
  isSelected: boolean; 
  size?: "sm" | "md" | "lg" 
}) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };
  
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  const getAnimationClass = () => {
    switch (persona.avatarAnimation) {
      case "subtle_pulse_golden":
        return "animate-pulse";
      case "heart_flame_glow":
        return "animate-pulse";
      case "thinking_statue_contemplation":
        return "hover:animate-bounce";
      default:
        return "";
    }
  };

  return (
    <div className={cn(
      sizeClasses[size],
      "rounded-xl flex items-center justify-center transition-all duration-300 shadow-md border-2",
      persona.bgColor,
      isSelected ? "border-teal-500 scale-110 shadow-lg" : "border-gray-200 hover:border-gray-300",
      getAnimationClass()
    )}>
      <persona.icon className={cn(iconSizes[size], persona.iconColor)} />
    </div>
  );
}

// Persona Selector Component (Grok-style dropdown)
interface ScholarPersonaSelectorProps {
  selectedPersona: ScholarPersona | null;
  onPersonaSelect: (persona: ScholarPersona | null) => void;
  context: {
    religion: Religion | null;
    book: string;
    chapter: number;
  };
}

export function ScholarPersonaSelector({ 
  selectedPersona, 
  onPersonaSelect, 
  context 
}: ScholarPersonaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-suggest persona based on context
  const getContextualSuggestion = () => {
    if (context.religion === "bible") return scholarPersonas[1]; // Historian for Bible
    if (context.religion === "quran") return scholarPersonas[2]; // Comparative for Quran
    if (context.religion === "torah") return scholarPersonas[4]; // Philosopher for Torah
    if (context.religion === "hindu") return scholarPersonas[0]; // Mystic for Hindu
    if (context.religion === "buddhist") return scholarPersonas[0]; // Mystic for Buddhist
    return scholarPersonas[2]; // Comparative for general queries
  };

  const contextualSuggestion = getContextualSuggestion();

  return (
    <div className="relative">
      {/* Main Selector Button */}
      <Button
        variant="outline"
        className={cn(
          "w-full justify-between bg-white hover:bg-gray-50 border-gray-200 text-left",
          selectedPersona ? selectedPersona.bgColor : "bg-gray-50"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {selectedPersona ? (
            <>
              <PersonaAvatar persona={selectedPersona} isSelected={true} size="sm" />
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium text-sm truncate", selectedPersona.textColor)}>
                  {selectedPersona.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {selectedPersona.conversationalStyle}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-700">Select Your Guide</p>
                <p className="text-xs text-gray-500">Choose a scholar persona</p>
              </div>
            </>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-500 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 border border-gray-200 shadow-lg bg-white">
          <ScrollArea className="max-h-80">
            <div className="p-2 space-y-1">
              {/* Contextual Suggestion */}
              {!selectedPersona && contextualSuggestion && (
                <div className="px-3 py-2 mb-2 bg-teal-50 rounded-lg border border-teal-200">
                  <p className="text-xs font-medium text-teal-800 mb-1">
                    💡 Suggested for {context.religion || 'this topic'}:
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-2 h-auto hover:bg-teal-100"
                    onClick={() => {
                      onPersonaSelect(contextualSuggestion);
                      setIsOpen(false);
                    }}
                  >
                    <PersonaAvatar persona={contextualSuggestion} isSelected={false} size="sm" />
                    <div className="ml-3 text-left">
                      <p className="font-medium text-sm text-teal-900">{contextualSuggestion.name}</p>
                      <p className="text-xs text-teal-700">{contextualSuggestion.title}</p>
                    </div>
                  </Button>
                </div>
              )}

              {/* All Personas */}
              {scholarPersonas.map((persona) => (
                <Button
                  key={persona.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start p-3 h-auto relative hover:bg-gray-50",
                    selectedPersona?.id === persona.id && "bg-gray-100"
                  )}
                  onClick={() => {
                    onPersonaSelect(persona);
                    setIsOpen(false);
                  }}
                >
                  <PersonaAvatar persona={persona} isSelected={selectedPersona?.id === persona.id} size="sm" />
                  <div className="ml-3 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{persona.name}</p>
                      {selectedPersona?.id === persona.id && (
                        <Check className="h-4 w-4 text-teal-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{persona.title}</p>
                    <p className="text-xs text-gray-500">{persona.description}</p>
                  </div>
                </Button>
              ))}

              {/* Clear Selection */}
              {selectedPersona && (
                <Button
                  variant="ghost"
                  className="w-full justify-center mt-2 pt-2 border-t border-gray-200 text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    onPersonaSelect(null);
                    setIsOpen(false);
                  }}
                >
                  Clear Selection
                </Button>
              )}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

// Enhanced Persona Display for Messages
export function PersonaBadge({ persona }: { persona: ScholarPersona }) {
  return (
    <div className="flex items-center gap-2">
      <PersonaAvatar persona={persona} isSelected={true} size="sm" />
      <div>
        <Badge variant="secondary" className={cn("text-xs", persona.textColor, persona.bgColor)}>
          {persona.name}
        </Badge>
        <p className="text-xs text-gray-500 mt-1">{persona.title}</p>
      </div>
    </div>
  );
}