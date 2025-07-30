import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, RotateCcw, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScholarPersona } from "./ScholarPersonas";

interface PersonaCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customPersona: Partial<ScholarPersona>) => void;
  currentCustomization?: Partial<ScholarPersona>;
}

const voicePresets = [
  { id: "calm_narrative_female", name: "Calm Narrative (Female)", description: "Soothing, clear female voice" },
  { id: "resonant_male_scholar", name: "Resonant Scholar (Male)", description: "Deep, authoritative male voice" },
  { id: "warm_female_counselor", name: "Warm Counselor (Female)", description: "Nurturing, empathetic female voice" },
  { id: "thoughtful_male_philosopher", name: "Thoughtful Philosopher (Male)", description: "Contemplative, wise male voice" },
  { id: "lively_neutral_explorer", name: "Lively Explorer (Neutral)", description: "Energetic, curious voice" },
  { id: "gentle_meditation_guide", name: "Gentle Guide (Soft)", description: "Peaceful, meditative voice" }
];

const conversationalStyles = [
  "Scholarly and precise",
  "Warm and nurturing", 
  "Philosophical and questioning",
  "Mystical and poetic",
  "Practical and encouraging",
  "Analytical and fact-based",
  "Playful and engaging"
];

const responseStructures = [
  "Context → Analysis → Conclusion",
  "Question → Exploration → Wisdom",
  "Empathy → Guidance → Blessing",
  "Facts → Connections → Insights",
  "Imagery → Meaning → Reflection"
];

export function PersonaCustomizer({ 
  isOpen, 
  onClose, 
  onSave, 
  currentCustomization 
}: PersonaCustomizerProps) {
  const [customization, setCustomization] = useState<Partial<ScholarPersona>>(
    currentCustomization || {
      name: "Your Personal Guide",
      title: "Custom Scholar Companion",
      description: "A personalized guide tailored to your preferences",
      voiceTone: "adaptable",
      elevenLabsVoice: "calm_narrative_female",
      conversationalStyle: "Scholarly and precise",
      responseStructure: "Context → Analysis → Conclusion",
      systemPrompt: "You are a knowledgeable spiritual guide who adapts to the user's preferences while maintaining scholarly depth and wisdom."
    }
  );

  const handleSave = () => {
    onSave(customization);
    onClose();
  };

  const handleReset = () => {
    setCustomization({
      name: "Your Personal Guide",
      title: "Custom Scholar Companion", 
      description: "A personalized guide tailored to your preferences",
      voiceTone: "adaptable",
      elevenLabsVoice: "calm_narrative_female",
      conversationalStyle: "Scholarly and precise",
      responseStructure: "Context → Analysis → Conclusion",
      systemPrompt: "You are a knowledgeable spiritual guide who adapts to the user's preferences while maintaining scholarly depth and wisdom."
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-900">Customize Your Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="persona-name">Guide Name</Label>
                <Input
                  id="persona-name"
                  value={customization.name || ""}
                  onChange={(e) => setCustomization(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Dr. Sarah Wisdom"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="persona-title">Title/Expertise</Label>
                <Input
                  id="persona-title"
                  value={customization.title || ""}
                  onChange={(e) => setCustomization(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Spiritual Counselor & Theologian"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="persona-description">Description</Label>
              <Textarea
                id="persona-description"
                value={customization.description || ""}
                onChange={(e) => setCustomization(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your guide's approach and personality..."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Voice and Style */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Voice & Style</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Voice Preset (ElevenLabs)</Label>
                <Select 
                  value={customization.elevenLabsVoice || "calm_narrative_female"}
                  onValueChange={(value) => setCustomization(prev => ({ ...prev, elevenLabsVoice: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voicePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{preset.name}</p>
                            <p className="text-xs text-gray-500">{preset.description}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conversational Style</Label>
                <Select 
                  value={customization.conversationalStyle || "Scholarly and precise"}
                  onValueChange={(value) => setCustomization(prev => ({ ...prev, conversationalStyle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conversationalStyles.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Response Structure</Label>
              <Select 
                value={customization.responseStructure || "Context → Analysis → Conclusion"}
                onValueChange={(value) => setCustomization(prev => ({ ...prev, responseStructure: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {responseStructures.map((structure) => (
                    <SelectItem key={structure} value={structure}>
                      {structure}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Advanced Customization */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Advanced Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt (Advanced)</Label>
              <Textarea
                id="system-prompt"
                value={customization.systemPrompt || ""}
                onChange={(e) => setCustomization(prev => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="Define how your guide should behave and respond..."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                This controls how your guide thinks and responds. Be specific about tone, expertise areas, and response style.
              </p>
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Preview</h3>
            <Card className="p-4 bg-gradient-to-br from-gray-50 to-slate-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-slate-100 rounded-xl flex items-center justify-center">
                  <Settings className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{customization.name || "Your Personal Guide"}</p>
                  <p className="text-sm text-gray-600">{customization.title || "Custom Scholar Companion"}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-2">{customization.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {customization.conversationalStyle}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {customization.elevenLabsVoice?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Customization
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}