import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Menu, 
  X, 
  Book, 
  MessageCircle, 
  Users, 
  Search, 
  Play,
  TrendingUp,
  Compass,
  Volume2,
  Eye,
  BookOpen,
  User
} from "lucide-react";
import rellioLogo from "@assets/image_1751817332000.png";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-64 bg-cosmic-navy border-l border-cosmic-purple/30 p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-white">Menu</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-cosmic-purple/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="space-y-4">
          <a href="#about" className="block text-white hover:text-cosmic-gold transition-colors" onClick={onClose}>
            About
          </a>
          <a href="#features" className="block text-white hover:text-cosmic-gold transition-colors" onClick={onClose}>
            Features
          </a>
          <a href="#faq" className="block text-white hover:text-cosmic-gold transition-colors" onClick={onClose}>
            FAQ
          </a>
        </nav>
      </div>
    </div>
  );
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sampleQuery, setSampleQuery] = useState("What is the meaning of life?");
  const [sampleResponse, setSampleResponse] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Simulate AI response for demo
    const response = "Peace is a universal aspiration found in all religious teachings. The Hebrew word 'Shalom' represents complete wholeness and harmony. Islamic 'Salaam' conveys similar concepts of peace and submission to divine will. Hindu traditions speak of 'Shanti' - inner peace that comes from spiritual realization. Buddhist teachings emphasize inner peace through mindfulness and liberation from suffering. These teachings show how different cultures approach the universal human longing for peace and harmony.";
    
    setTimeout(() => {
      setSampleResponse(response);
    }, 2000);
  }, [sampleQuery]);

  const handleGetStarted = () => {
    setLocation('/dashboard');
  };

  return (
    <div 
      className="min-h-screen bg-cosmic-navy"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(255, 215, 0, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
        `
      }}
    >
      {/* Navigation */}
      <nav className="relative z-40 py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={rellioLogo} alt="Rellio" className="w-10 h-10 object-contain" />
            <h1 className="text-xl font-bold text-white">Rellio</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#about" className="text-white/80 hover:text-cosmic-gold transition-colors">About</a>
            <a href="#features" className="text-white/80 hover:text-cosmic-gold transition-colors">Features</a>
            <a href="#faq" className="text-white/80 hover:text-cosmic-gold transition-colors">FAQ</a>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-white hover:bg-cosmic-purple/20"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Hero Section */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Cosmic Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating Particles */}
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cosmic-gold/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Main Logo */}
          <div className="mb-8">
            <img 
              src={rellioLogo} 
              alt="Rellio Compass" 
              className="w-48 h-48 mx-auto object-contain filter drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]" 
            />
          </div>
          
          {/* RELLIO Title */}
          <h1 
            className="text-6xl md:text-8xl font-bold text-cosmic-gold mb-16 tracking-widest"
            style={{
              textShadow: '0 0 30px rgba(255, 215, 0, 0.5), 0 0 60px rgba(255, 215, 0, 0.3)'
            }}
          >
            RELLIO
          </h1>
        </div>
      </section>

      {/* About Rellio Section */}
      <section id="about" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-cosmic-gold mb-8 tracking-wider">
            ABOUT RELLIO
          </h2>
          <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-12 max-w-3xl mx-auto">
            Rellio is an AI-driven platform that provides access to sacred scriptures from 
            multiple religious traditions. Our mission is to foster understanding, dialogue, and 
            spiritual growth through thoughtful engagement with religious texts that 
            respects the depth and nuance of each tradition.
          </p>
        </div>
      </section>

      {/* AI Chat Demo Section */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-black/40 border border-cosmic-purple/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-cosmic-gold flex items-center justify-center space-x-2 text-xl">
                <MessageCircle className="w-6 h-6" />
                <span>Ask Our AI Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                value={sampleQuery}
                onChange={(e) => setSampleQuery(e.target.value)}
                className="bg-black/20 border-cosmic-purple/30 text-white placeholder:text-white/50 backdrop-blur-sm text-lg py-3"
                placeholder="What is the meaning of life?"
              />
              {sampleResponse && (
                <div className="bg-black/30 rounded-xl p-6 text-white/90 text-left border border-cosmic-purple/20 backdrop-blur-sm">
                  <p className="leading-relaxed">{sampleResponse}</p>
                </div>
              )}
              <Button
                onClick={handleGetStarted}
                className="w-full bg-cosmic-gold hover:bg-cosmic-gold/90 text-black font-semibold py-3 text-lg rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]"
              >
                Start exploring now
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* About Rellio Description */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-6">About Rellio</h3>
          <p className="text-lg text-white/80 leading-relaxed">
            AI-driven platform provides access to sacred scriptures from multiple 
            religious traditions. Our mission is to foster understanding, dialogue, 
            and spiritual growth through thoughtful engagement on religious texts.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-cosmic-gold mb-16 text-center tracking-wider">
            FEATURES
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Select Text */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-black/40 border border-cosmic-purple/30 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <BookOpen className="w-8 h-8 text-cosmic-gold" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Select Text</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Access from various religious fractions and previewing
              </p>
            </div>

            {/* Navigate */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-black/40 border border-cosmic-purple/30 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Book className="w-8 h-8 text-cosmic-gold" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Navigate</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Check off/plugins with scholar rich insights
              </p>
            </div>

            {/* Ask AI */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-black/40 border border-cosmic-purple/30 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <MessageCircle className="w-8 h-8 text-cosmic-gold" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Ask AI</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Get insights from secular personas in prestorands
              </p>
            </div>

            {/* Discuss */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-black/40 border border-cosmic-purple/30 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Users className="w-8 h-8 text-cosmic-gold" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Discuss</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Engage in meaningful dialogues across religious traditions
              </p>
            </div>

            {/* Voice Playback */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-black/40 border border-cosmic-purple/30 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Volume2 className="w-8 h-8 text-cosmic-gold" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Voice Playback</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Access to wireless and AI con hots Speech fullcode
              </p>
            </div>

            {/* Smart Search */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-black/40 border border-cosmic-purple/30 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Search className="w-8 h-8 text-cosmic-gold" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Smart Search</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Track your reading progress and store meaningful insights
              </p>
            </div>

            {/* Personal Progress */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-black/40 border border-cosmic-purple/30 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <User className="w-8 h-8 text-cosmic-gold" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Personal Progress</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Compare interpretations across different traditions
              </p>
            </div>

            {/* Multi-Perspective */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-black/40 border border-cosmic-purple/30 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Eye className="w-8 h-8 text-cosmic-gold" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Multi-Perspective</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Compare interpretations across religious traditions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-cosmic-gold mb-8 tracking-wider">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-white/80">
              Everything you need to know about using Rellio
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-6">
            <AccordionItem 
              value="item-1" 
              className="bg-black/40 border border-cosmic-purple/30 rounded-xl overflow-hidden backdrop-blur-md"
            >
              <AccordionTrigger className="px-6 py-4 text-white hover:text-cosmic-gold transition-colors">
                What religious texts are available on Rellio?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-white/80">
                Rellio provides access to major religious scriptures including the Bible (various translations), 
                Quran, Torah, Hadith collections, Bhagavad Gita, Upanishads, and Buddhist Tripitaka texts.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem 
              value="item-2" 
              className="bg-black/40 border border-cosmic-purple/30 rounded-xl overflow-hidden backdrop-blur-md"
            >
              <AccordionTrigger className="px-6 py-4 text-white hover:text-cosmic-gold transition-colors">
                How does the AI guidance work?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-white/80">
                Our AI features specialized religious scholar personas for each tradition - Islamic Mufti, 
                Christian Priest, Jewish Rabbi, Hindu Guru, and Buddhist Monk - providing contextually 
                appropriate guidance while respecting the depth and nuance of each religious tradition.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem 
              value="item-3" 
              className="bg-black/40 border border-cosmic-purple/30 rounded-xl overflow-hidden backdrop-blur-md"
            >
              <AccordionTrigger className="px-6 py-4 text-white hover:text-cosmic-gold transition-colors">
                Is Rellio suitable for people of all faiths?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-white/80">
                Yes, Rellio is designed to be inclusive and respectful of all religious traditions. 
                Whether you're exploring your own faith more deeply or learning about other traditions, 
                our platform provides balanced, scholarly perspectives.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem 
              value="item-4" 
              className="bg-black/40 border border-cosmic-purple/30 rounded-xl overflow-hidden backdrop-blur-md"
            >
              <AccordionTrigger className="px-6 py-4 text-white hover:text-cosmic-gold transition-colors">
                Can I track my reading progress?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-white/80">
                Absolutely! Rellio includes a comprehensive progress tracking system that monitors your 
                reading sessions, study time, chapter completions, and spiritual journey milestones 
                across all religious traditions.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem 
              value="item-5" 
              className="bg-black/40 border border-cosmic-purple/30 rounded-xl overflow-hidden backdrop-blur-md"
            >
              <AccordionTrigger className="px-6 py-4 text-white hover:text-cosmic-gold transition-colors">
                Does Rellio support voice interaction?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-white/80">
                Yes! Rellio features voice recognition for spoken questions and text-to-speech 
                capabilities for audio playback of responses, making it accessible for different 
                learning preferences and accessibility needs.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Begin Your Spiritual Journey
          </h2>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            Explore sacred texts with AI-guided wisdom across multiple religious traditions
          </p>
          <Button
            onClick={handleGetStarted}
            className="bg-cosmic-gold hover:bg-cosmic-gold/90 text-black font-bold py-4 px-8 text-xl rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.4)]"
          >
            Start Exploring Now
          </Button>
        </div>
      </section>
    </div>
  );
}