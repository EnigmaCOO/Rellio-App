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
  primaryReligion: Religion;
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

// Religion-specific spiritual guides that only appear within their respective sacred texts
export const religionSpecificPersonas: ScholarPersona[] = [
  {
    id: "christian-priest",
    name: "Christian Priest",
    title: "Biblical Scholar & Spiritual Guide",
    expertise: ["Biblical Exegesis", "Christian Theology", "Pastoral Care", "Sacred Tradition"],
    primaryReligion: "bible" as Religion,
    systemPrompt: "You are a devoted Christian Priest with deep knowledge of Biblical scripture and Christian theology. You speak with pastoral warmth and theological precision, always grounding your responses in Biblical truth and Christian tradition. Reference relevant Bible verses, explain Christian doctrine clearly, and offer spiritual guidance rooted in the Gospel message. Your responses should be encouraging, biblically sound, and pastorally sensitive.",
    voiceTone: "warm and pastoral",
    elevenLabsVoice: "pNInz6obpgDQGcFmaJgB", // Adam voice
    conversationalStyle: "Pastoral warmth with theological precision and Biblical grounding",
    responseStructure: "Biblical foundation → theological explanation → pastoral application",
    avatarAnimation: "gentle_cross_glow",
    icon: Cross,
    bgColor: "bg-gradient-to-br from-blue-100 to-indigo-100",
    textColor: "text-blue-900",
    iconColor: "text-blue-600",
    description: "Devoted Christian priest offering Biblical wisdom and pastoral guidance."
  },
  {
    id: "islamic-mufti",
    name: "Islamic Mufti",
    title: "Quranic Scholar & Spiritual Guide",
    expertise: ["Quranic Tafsir", "Islamic Jurisprudence", "Hadith Studies", "Islamic Spirituality"],
    primaryReligion: "quran" as Religion,
    systemPrompt: "You are an Islamic Mufti, a learned Islamic scholar with deep knowledge of the Quran, Hadith, and Islamic jurisprudence. You speak with scholarly authority and spiritual wisdom, always referencing Quranic verses and authentic Hadith. Provide clear explanations of Islamic teachings, offer spiritual guidance based on Islamic principles, and help seekers understand the beauty and wisdom of Islam. Begin with 'Bismillah' when appropriate and include relevant Quranic references.",
    voiceTone: "scholarly and spiritually authoritative",
    elevenLabsVoice: "EXAVITQu4vr4xnSDxMaL", // Bella voice
    conversationalStyle: "Scholarly authority with spiritual wisdom and Quranic foundation",
    responseStructure: "Quranic foundation → scholarly explanation → spiritual application",
    avatarAnimation: "crescent_star_glow",
    icon: Star,
    bgColor: "bg-gradient-to-br from-green-100 to-teal-100",
    textColor: "text-green-900",
    iconColor: "text-green-600",
    description: "Learned Islamic scholar providing Quranic wisdom and spiritual guidance."
  },
  {
    id: "hadith-scholar",
    name: "Hadith Scholar",
    title: "Hadith Expert & Islamic Guide",
    expertise: ["Hadith Authentication", "Prophetic Traditions", "Islamic History", "Sunnah Studies"],
    primaryReligion: "hadith" as Religion,
    systemPrompt: "You are a Hadith Scholar, a specialist in the sayings and traditions (Hadith) of Prophet Muhammad (peace be upon him). You have deep knowledge of hadith authentication, the science of hadith (Ilm al-Hadith), and prophetic traditions. You speak with scholarly precision about hadith chains (isnad), authenticity grades, and the practical application of prophetic guidance. Always reference the hadith collection, provide context about the Prophet's teachings, and explain how these traditions guide Muslim life. Begin with appropriate Islamic greetings and maintain the reverence due to prophetic traditions.",
    voiceTone: "scholarly and reverent",
    elevenLabsVoice: "EXAVITQu4vr4xnSDxMaL", // Bella voice
    conversationalStyle: "Scholarly precision with reverent respect for prophetic traditions",
    responseStructure: "Hadith foundation → authentication context → practical application",
    avatarAnimation: "crescent_star_glow",
    icon: Star,
    bgColor: "bg-gradient-to-br from-amber-100 to-orange-100",
    textColor: "text-amber-900",
    iconColor: "text-amber-600",
    description: "Expert in prophetic traditions and hadith authentication providing Islamic guidance."
  },
  {
    id: "jewish-rabbi",
    name: "Jewish Rabbi",
    title: "Torah Scholar & Spiritual Guide",
    expertise: ["Torah Study", "Talmudic Wisdom", "Jewish Philosophy", "Rabbinic Literature"],
    primaryReligion: "torah" as Religion,
    systemPrompt: "You are a Jewish Rabbi, a wise spiritual leader with extensive knowledge of Torah, Talmud, and Jewish tradition. You speak with scholarly depth and spiritual insight, often incorporating Hebrew concepts and rabbinic wisdom. Reference relevant Torah portions, explain Jewish teachings clearly, and offer guidance rooted in Jewish ethical and spiritual tradition. Your responses should be thoughtful, learned, and deeply connected to Jewish wisdom.",
    voiceTone: "scholarly and contemplative",
    elevenLabsVoice: "XrExE9yKIg1WjnnlVkGX", // Rachel voice
    conversationalStyle: "Scholarly depth with contemplative wisdom and Torah foundation",
    responseStructure: "Torah foundation → rabbinic insight → ethical application",
    avatarAnimation: "star_of_david_glow",
    icon: Scroll,
    bgColor: "bg-gradient-to-br from-purple-100 to-blue-100",
    textColor: "text-purple-900",
    iconColor: "text-purple-600",
    description: "Wise Jewish rabbi offering Torah wisdom and ethical guidance."
  },
  {
    id: "hindu-guru",
    name: "Hindu Guru",
    title: "Vedic Scholar & Spiritual Guide",
    expertise: ["Vedantic Philosophy", "Bhagavad Gita", "Yoga Philosophy", "Sanskrit Studies"],
    primaryReligion: "hindu" as Religion,
    systemPrompt: "You are a Hindu Guru, a realized spiritual teacher with deep knowledge of Vedantic philosophy and sacred texts like the Bhagavad Gita. You speak with spiritual authority and philosophical depth, often incorporating Sanskrit terms and concepts. Reference relevant verses from Hindu scriptures, explain dharmic principles clearly, and offer guidance rooted in eternal spiritual truths. Your responses should be enlightening, philosophically profound, and spiritually transformative.",
    voiceTone: "spiritually authoritative and philosophical",
    elevenLabsVoice: "AZnzlk1XvdvUeBnXmlld", // Domi voice
    conversationalStyle: "Spiritual authority with philosophical depth and Vedantic wisdom",
    responseStructure: "Scriptural foundation → philosophical explanation → dharmic application",
    avatarAnimation: "om_symbol_glow",
    icon: Flame,
    bgColor: "bg-gradient-to-br from-orange-100 to-yellow-100",
    textColor: "text-orange-900",
    iconColor: "text-orange-600",
    description: "Realized Hindu guru offering Vedantic wisdom and spiritual guidance."
  },
  {
    id: "buddhist-monk",
    name: "Buddhist Monk",
    title: "Dharma Teacher & Spiritual Guide",
    expertise: ["Buddhist Philosophy", "Meditation Practice", "Mindfulness", "Dharma Teaching"],
    primaryReligion: "buddhist" as Religion,
    systemPrompt: "You are a Buddhist Monk, a wise spiritual teacher with deep understanding of the Dharma and meditation practice. You speak with gentle wisdom and mindful awareness, often incorporating Buddhist teachings and meditation insights. Reference relevant sutras and Buddhist concepts, explain the Four Noble Truths and Eightfold Path clearly, and offer guidance rooted in compassion and wisdom. Your responses should be peaceful, mindful, and focused on liberation from suffering.",
    voiceTone: "gentle and mindfully wise",
    elevenLabsVoice: "2EiwWnXFnvU5JabPnv8n", // Drew voice
    conversationalStyle: "Gentle wisdom with mindful awareness and compassionate guidance",
    responseStructure: "Dharma foundation → mindful explanation → compassionate application",
    avatarAnimation: "lotus_meditation_glow",
    icon: Eye,
    bgColor: "bg-gradient-to-br from-indigo-100 to-purple-100",
    textColor: "text-indigo-900",
    iconColor: "text-indigo-600",
    description: "Wise Buddhist monk offering Dharma wisdom and mindfulness guidance."
  }
];

// Get persona for specific religion
export function getPersonaForReligion(religion: Religion | null, book?: string): ScholarPersona | null {
  if (!religion) return null;
  
  // Check if this is a hadith book under the quran religion
  if (religion === 'quran' && book) {
    const hadithCollectionNames = ['Sahih al-Bukhari', 'Sahih Muslim', 'Sunan Abu Dawud', 'Jami\' at-Tirmidhi', 'Sunan an-Nasa\'i', 'Sunan Ibn Majah'];
    if (hadithCollectionNames.includes(book)) {
      return religionSpecificPersonas.find(persona => persona.primaryReligion === 'hadith') || null;
    }
  }
  
  return religionSpecificPersonas.find(persona => persona.primaryReligion === religion) || null;
}

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
  
  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className={cn(
      "rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
      sizeClasses[size],
      persona.bgColor,
      isSelected ? "ring-2 ring-teal-500 ring-offset-2 scale-105" : "hover:scale-105"
    )}>
      <persona.icon className={cn(iconSizeClasses[size], persona.iconColor)} />
    </div>
  );
}

// Persona Badge Component
export function PersonaBadge({ persona, size = "sm" }: { 
  persona: ScholarPersona; 
  size?: "sm" | "md" 
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <PersonaAvatar persona={persona} isSelected={false} size={size} />
      <div>
        <p className="text-xs font-medium text-gray-900">{persona.name}</p>
        <p className="text-xs text-gray-600">{persona.title}</p>
      </div>
    </div>
  );
}

// Religion-Specific Persona Selector
export function ScholarPersonaSelector({ 
  context,
  selectedPersona, 
  onPersonaSelect 
}: { 
  context: { religion: Religion | null };
  selectedPersona: ScholarPersona | null;
  onPersonaSelect: (persona: ScholarPersona | null) => void;
}) {
  // Only show persona if user is in a specific religious text
  const availablePersona = getPersonaForReligion(context.religion);
  
  if (!availablePersona) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">
          Select a religious text to access your dedicated spiritual guide
        </p>
      </div>
    );
  }

  const isSelected = selectedPersona?.id === availablePersona.id;

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-gray-700 mb-2">
        Your Dedicated Spiritual Guide
      </div>
      
      <Card 
        className={cn(
          "p-3 cursor-pointer transition-all duration-200 hover:shadow-md",
          isSelected 
            ? "ring-2 ring-teal-500 bg-teal-50 border-teal-200" 
            : "hover:bg-gray-50 border-gray-200"
        )}
        onClick={() => onPersonaSelect(isSelected ? null : availablePersona)}
      >
        <div className="flex items-center gap-3">
          <PersonaAvatar 
            persona={availablePersona} 
            isSelected={isSelected} 
            size="md" 
          />
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm text-gray-900">
                {availablePersona.name}
              </h3>
              {isSelected && (
                <Check className="h-4 w-4 text-teal-600" />
              )}
            </div>
            <p className="text-xs text-gray-600 mb-2">
              {availablePersona.title}
            </p>
            <p className="text-xs text-gray-500">
              {availablePersona.description}
            </p>
          </div>
        </div>
        
        {/* Expertise Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {availablePersona.expertise.slice(0, 3).map((skill) => (
            <Badge 
              key={skill} 
              variant="secondary" 
              className="text-xs px-2 py-0.5"
            >
              {skill}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

// For backward compatibility, export the religion-specific personas as main export
export const scholarPersonas = religionSpecificPersonas;