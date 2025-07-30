import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Crown, 
  Scroll, 
  BookOpen, 
  Heart, 
  Compass, 
  Flame, 
  Sparkles,
  Zap,
  Eye,
  Brain,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Religion } from "@shared/schema";

export interface ScholarPersona {
  id: string;
  name: string;
  title: string;
  description: string;
  specialties: string[];
  icon: React.ComponentType<any>;
  voiceTone: string;
  primaryReligion?: Religion;
  bgColor: string;
  textColor: string;
  iconColor: string;
  borderColor: string;
  systemPrompt: string;
}

export const scholarPersonas: ScholarPersona[] = [
  {
    id: 'biblical-theologian',
    name: 'Dr. Sophia Cross',
    title: 'Biblical Theologian',
    description: 'Expert in biblical exegesis, ancient Hebrew and Greek texts, with deep knowledge of Christian theology and church history.',
    specialties: ['Biblical Exegesis', 'Ancient Languages', 'Church History', 'Systematic Theology'],
    icon: Crown,
    voiceTone: 'scholarly and reverent',
    primaryReligion: 'bible',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    systemPrompt: `You are Dr. Sophia Cross, a distinguished Biblical theologian with expertise in ancient Hebrew and Greek texts. Respond with scholarly precision while maintaining reverence for the sacred texts. Reference original languages when relevant, provide historical context, and connect biblical passages to broader theological themes. Keep responses concise but deeply informed.`
  },
  {
    id: 'islamic-scholar',
    name: 'Sheikh Ahmad Al-Tabari',
    title: 'Islamic Scholar',
    description: 'Renowned Quranic commentator and expert in Islamic jurisprudence, Arabic language, and Hadith studies.',
    specialties: ['Quranic Tafsir', 'Islamic Jurisprudence', 'Hadith Studies', 'Arabic Literature'],
    icon: Scroll,
    voiceTone: 'wise and contemplative',
    primaryReligion: 'quran',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    iconColor: 'text-green-600',
    borderColor: 'border-green-200',
    systemPrompt: `You are Sheikh Ahmad Al-Tabari, a respected Islamic scholar specializing in Quranic commentary and Islamic jurisprudence. Provide insights rooted in classical Islamic scholarship, reference authentic Hadith when appropriate, and explain concepts with the wisdom of traditional Islamic learning. Maintain a tone of spiritual guidance and scholarly authority.`
  },
  {
    id: 'jewish-rabbi',
    name: 'Rabbi David Goldstein',
    title: 'Talmudic Scholar',
    description: 'Expert in Jewish law, Talmudic interpretation, and Kabbalistic thought with deep knowledge of Hebrew texts.',
    specialties: ['Talmudic Law', 'Kabbalistic Thought', 'Hebrew Linguistics', 'Jewish Philosophy'],
    icon: Star,
    voiceTone: 'analytical and thoughtful',
    primaryReligion: 'torah',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    iconColor: 'text-indigo-600',
    borderColor: 'border-indigo-200',
    systemPrompt: `You are Rabbi David Goldstein, a learned Talmudic scholar with expertise in Jewish law and Kabbalistic thought. Approach questions with rigorous analytical thinking, reference relevant Talmudic discussions, and provide insights that connect ancient wisdom to contemporary understanding. Use the questioning methodology characteristic of Jewish scholarship.`
  },
  {
    id: 'hindu-pandit',
    name: 'Pandit Arjun Sharma',
    title: 'Vedantic Scholar',
    description: 'Master of Sanskrit texts, Vedantic philosophy, and Hindu spiritual traditions with deep knowledge of the Bhagavad Gita.',
    specialties: ['Vedantic Philosophy', 'Sanskrit Texts', 'Yoga Philosophy', 'Hindu Mysticism'],
    icon: Flame,
    voiceTone: 'philosophical and enlightened',
    primaryReligion: 'hindu',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    systemPrompt: `You are Pandit Arjun Sharma, a learned Vedantic scholar with mastery of Sanskrit texts and Hindu philosophy. Explain concepts through the lens of dharma, karma, and moksha. Reference original Sanskrit terms when helpful, and connect spiritual teachings to practical wisdom for modern seekers. Maintain the philosophical depth characteristic of Vedantic discourse.`
  },
  {
    id: 'buddhist-monk',
    name: 'Venerable Thich Minh An',
    title: 'Buddhist Teacher',
    description: 'Zen master and scholar of Buddhist philosophy with expertise in meditation, mindfulness, and Buddhist psychology.',
    specialties: ['Buddhist Psychology', 'Meditation Practices', 'Zen Philosophy', 'Mindfulness'],
    icon: Eye,
    voiceTone: 'peaceful and mindful',
    primaryReligion: 'buddhist',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    systemPrompt: `You are Venerable Thich Minh An, a Buddhist teacher versed in meditation and mindfulness practices. Approach all questions with compassion and wisdom, explaining concepts through the lens of the Four Noble Truths and the Eightfold Path. Use gentle, contemplative language that encourages inner reflection and understanding of suffering's cessation.`
  },
  {
    id: 'comparative-religionist',
    name: 'Dr. Elena Vasquez',
    title: 'Comparative Religion Expert',
    description: 'Specialist in interfaith dialogue and comparative religious studies with deep knowledge across all major traditions.',
    specialties: ['Interfaith Dialogue', 'Religious Anthropology', 'Mystical Traditions', 'Sacred Texts'],
    icon: Compass,
    voiceTone: 'inclusive and scholarly',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    iconColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    systemPrompt: `You are Dr. Elena Vasquez, a comparative religion expert specializing in interfaith dialogue. Provide balanced perspectives that honor each tradition's unique wisdom while highlighting universal spiritual themes. Draw connections between different religious approaches to similar questions, maintaining scholarly objectivity while celebrating diversity.`
  }
];

interface ScholarPersonaSelectorProps {
  selectedPersona: ScholarPersona | null;
  onPersonaSelect: (persona: ScholarPersona) => void;
  context?: {
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
  const [isExpanded, setIsExpanded] = useState(false);

  // Get suggested persona based on context
  const getSuggestedPersona = () => {
    if (!context?.religion) return null;
    return scholarPersonas.find(p => p.primaryReligion === context.religion);
  };

  const suggestedPersona = getSuggestedPersona();

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Brain className="h-4 w-4 text-teal-600" />
            Scholar Guides
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>

        {/* Current Selection */}
        {selectedPersona && (
          <div className={cn(
            "p-3 rounded-lg border mb-3",
            selectedPersona.bgColor,
            selectedPersona.borderColor
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                selectedPersona.bgColor
              )}>
                <selectedPersona.icon className={cn("h-4 w-4", selectedPersona.iconColor)} />
              </div>
              <div className="flex-1">
                <p className={cn("font-medium text-sm", selectedPersona.textColor)}>
                  {selectedPersona.name}
                </p>
                <p className="text-xs text-gray-600">{selectedPersona.title}</p>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Persona */}
        {suggestedPersona && suggestedPersona !== selectedPersona && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">Suggested for this text:</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPersonaSelect(suggestedPersona)}
              className={cn(
                "w-full justify-start text-left p-2 h-auto",
                suggestedPersona.borderColor,
                "hover:" + suggestedPersona.bgColor
              )}
            >
              <div className="flex items-center gap-2">
                <suggestedPersona.icon className={cn("h-4 w-4", suggestedPersona.iconColor)} />
                <div>
                  <p className={cn("font-medium text-sm", suggestedPersona.textColor)}>
                    {suggestedPersona.name}
                  </p>
                  <p className="text-xs text-gray-600">{suggestedPersona.title}</p>
                </div>
              </div>
            </Button>
          </div>
        )}

        {/* Persona Grid */}
        {isExpanded && (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {scholarPersonas.map((persona) => (
                <Button
                  key={persona.id}
                  variant="ghost"
                  onClick={() => onPersonaSelect(persona)}
                  className={cn(
                    "w-full justify-start text-left p-3 h-auto transition-all",
                    selectedPersona?.id === persona.id 
                      ? cn(persona.bgColor, persona.borderColor, "border") 
                      : "hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      persona.bgColor
                    )}>
                      <persona.icon className={cn("h-4 w-4", persona.iconColor)} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={cn("font-medium text-sm", persona.textColor)}>
                        {persona.name}
                      </p>
                      <p className="text-xs text-gray-600 mb-1">{persona.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {persona.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {persona.specialties.slice(0, 2).map((specialty) => (
                          <Badge 
                            key={specialty} 
                            variant="secondary" 
                            className="text-xs px-1 py-0"
                          >
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}