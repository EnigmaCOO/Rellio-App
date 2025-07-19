import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, X } from "lucide-react";

interface CompareGridProps {
  isActive: boolean;
  onClose: () => void;
  selectedVerse?: {
    text: string;
    reference: string;
    religion: string;
  };
}

// Sample comparative verses for demonstration
const comparativeVerses = {
  peace: [
    {
      religion: "Christianity",
      text: "Blessed are the peacemakers, for they will be called children of God.",
      reference: "Matthew 5:9",
      color: "bg-blue-50 border-blue-200"
    },
    {
      religion: "Islam",
      text: "And if they incline to peace, then incline to it also and trust in Allah.",
      reference: "Quran 8:61",
      color: "bg-green-50 border-green-200"
    },
    {
      religion: "Judaism",
      text: "Turn from evil and do good; seek peace and pursue it.",
      reference: "Psalm 34:14",
      color: "bg-purple-50 border-purple-200"
    },
    {
      religion: "Hinduism",
      text: "May all beings be happy and peaceful. May all beings be free from harm.",
      reference: "Bhagavad Gita 12:13",
      color: "bg-orange-50 border-orange-200"
    },
    {
      religion: "Buddhism",
      text: "Better than a thousand hollow words is one word that brings peace.",
      reference: "Dhammapada 100",
      color: "bg-yellow-50 border-yellow-200"
    }
  ],
  love: [
    {
      religion: "Christianity",
      text: "Love your neighbor as yourself.",
      reference: "Mark 12:31",
      color: "bg-blue-50 border-blue-200"
    },
    {
      religion: "Islam",
      text: "None of you believes until he loves for his brother what he loves for himself.",
      reference: "Hadith 13",
      color: "bg-green-50 border-green-200"
    },
    {
      religion: "Judaism",
      text: "Love your neighbor as yourself: I am the Lord.",
      reference: "Leviticus 19:18",
      color: "bg-purple-50 border-purple-200"
    },
    {
      religion: "Hinduism",
      text: "The self in you is the same as the self in all beings.",
      reference: "Bhagavad Gita 6:32",
      color: "bg-orange-50 border-orange-200"
    },
    {
      religion: "Buddhism",
      text: "Hatred is never appeased by hatred in this world. By non-hatred alone is hatred appeased.",
      reference: "Dhammapada 5",
      color: "bg-yellow-50 border-yellow-200"
    }
  ]
};

export function CompareGrid({ isActive, onClose, selectedVerse }: CompareGridProps) {
  const [selectedTheme, setSelectedTheme] = useState<'peace' | 'love'>('peace');
  
  if (!isActive) return null;

  const currentVerses = comparativeVerses[selectedTheme];

  return (
    <div className="bg-rellio-white rounded-lg border border-gray-200 shadow-lg p-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-rellio-accent-teal" />
          <h3 className="font-semibold text-rellio-dark-gray">Compare Across Traditions</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-500 hover:text-rellio-dark-gray"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Theme Selection */}
      <div className="flex gap-2 mb-4">
        {Object.keys(comparativeVerses).map((theme) => (
          <Button
            key={theme}
            variant={selectedTheme === theme ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTheme(theme as 'peace' | 'love')}
            className={selectedTheme === theme ? "bg-rellio-accent-teal hover:bg-rellio-accent-teal/90" : ""}
          >
            {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </Button>
        ))}
      </div>

      {/* Comparison Grid */}
      <ScrollArea className="h-64">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentVerses.map((verse, index) => (
            <Card key={index} className={`p-3 ${verse.color} transition-all hover:shadow-md`}>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {verse.religion}
                </Badge>
                <p className="text-sm text-rellio-dark-gray leading-relaxed">
                  "{verse.text}"
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  {verse.reference}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Comparing universal themes across religious traditions
        </p>
      </div>
    </div>
  );
}