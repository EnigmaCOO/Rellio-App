import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  X, 
  Flame, 
  Book, 
  MessageCircle, 
  Users, 
  Search, 
  Play,
  Star,
  ChevronDown,
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import rellioLogo from "@assets/Rellio logo_1756155085148.png";
import { useQuery } from "@tanstack/react-query";
import { MandalaBackground } from "@/components/MandalaBackground";

// Religious symbol components
const CrossSymbol = () => (
  <svg className="w-8 h-8 religious-symbol animate-floating-symbol" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CrescentSymbol = () => (
  <svg className="w-8 h-8 religious-symbol animate-floating-symbol" viewBox="0 0 24 24" fill="currentColor" style={{animationDelay: '1s'}}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" fill="none"/>
    <polygon points="16,6 18,2 22,4" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
  </svg>
);

const StarOfDavidSymbol = () => (
  <svg className="w-8 h-8 religious-symbol animate-floating-symbol" viewBox="0 0 24 24" fill="currentColor" style={{animationDelay: '2s'}}>
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const DharmaWheelSymbol = () => (
  <svg className="w-8 h-8 religious-symbol animate-floating-symbol" viewBox="0 0 24 24" fill="currentColor" style={{animationDelay: '3s'}}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M12 2v4M12 18v4M22 12h-4M6 12H2M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83M19.07 19.07l-2.83-2.83M7.76 7.76L4.93 4.93" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const OmSymbol = () => (
  <svg className="w-8 h-8 religious-symbol animate-floating-symbol" viewBox="0 0 24 24" fill="currentColor" style={{animationDelay: '4s'}}>
    <path d="M8 12c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6c-1.66 0-3.16-.67-4.24-1.76L8 12zM2 12c0 5.52 4.48 10 10 10s10-4.48 10-10S17.52 2 12 2 2 6.48 2 12z" stroke="currentColor" strokeWidth="2" fill="none"/>
    <circle cx="8" cy="8" r="2" fill="currentColor"/>
    <path d="M16 16c-2 0-3-1-3-3s1-3 3-3" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-64 bg-dark-indigo border-l border-neon-blue p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-white">Menu</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-indigo-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="space-y-4">
          <a href="#about" className="block text-white hover:text-neon-cyan transition-colors" onClick={onClose}>
            About
          </a>
          <a href="#how-it-works" className="block text-white hover:text-neon-cyan transition-colors" onClick={onClose}>
            How It Works
          </a>
          <a href="#features" className="block text-white hover:text-neon-cyan transition-colors" onClick={onClose}>
            Features
          </a>
          <a href="#faq" className="block text-white hover:text-neon-cyan transition-colors" onClick={onClose}>
            FAQ
          </a>
          <a href="#contact" className="block text-white hover:text-neon-cyan transition-colors" onClick={onClose}>
            Contact
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

  const { data: religions } = useQuery({
    queryKey: ['/api/religions'],
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    // Simulate AI response for demo
    const responses = [
      "The meaning of life is a profound question that has been contemplated across multiple religious traditions. From the Christian perspective, it involves loving God and serving others (Matthew 22:37-39). Islamic teachings emphasize worshipping Allah and being His steward on Earth (Quran 2:30). Hindu philosophy speaks of dharma - fulfilling one's righteous duty while seeking moksha (liberation). Buddhist teachings focus on ending suffering through the Eightfold Path. Each tradition offers unique insights into purpose, meaning, and spiritual fulfillment.",
      "Love is central to human existence across all religious traditions. Christianity teaches 'God is love' (1 John 4:8), emphasizing divine love as the foundation of creation. Islam describes Allah as Ar-Rahman (The Most Compassionate), with love being a divine attribute. Hindu texts speak of bhakti (devotion) and universal love as paths to the divine. Buddhist teachings emphasize metta (loving-kindness) as essential for spiritual growth. Each tradition recognizes love as both a divine quality and human responsibility.",
      "Peace is a universal aspiration found in all religious teachings. The Hebrew word 'Shalom' represents complete wholeness and harmony. Islamic 'Salaam' conveys similar concepts of peace and submission to divine will. Hindu traditions speak of 'Shanti' - inner peace that comes from spiritual realization. Buddhist teachings emphasize inner peace through mindfulness and liberation from suffering. These teachings show how different cultures approach the universal human longing for peace and harmony."
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    setTimeout(() => {
      setSampleResponse(randomResponse);
    }, 2000);
  }, [sampleQuery]);

  const handleGetStarted = () => {
    setLocation('/dashboard');
  };

  return (
    <div className="futuristic-bg min-h-screen">
      {/* Navigation */}
      <nav className="relative z-40 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img src={rellioLogo} alt="Rellio" className="w-12 h-12 object-contain animate-neon-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border border-cosmic-gold rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-2xl font-bold text-white">Rellio</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#about" className="text-white hover:text-neon-cyan transition-colors">About</a>
            <a href="#how-it-works" className="text-white hover:text-neon-cyan transition-colors">How It Works</a>
            <a href="#features" className="text-white hover:text-neon-cyan transition-colors">Features</a>
            <a href="#faq" className="text-white hover:text-neon-cyan transition-colors">FAQ</a>
            <a href="#contact" className="text-white hover:text-neon-cyan transition-colors">Contact</a>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-white hover:bg-indigo-800"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Hero Section - Majestic Cosmic Design */}
      <section 
        className="relative py-32 px-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--bg-indigo) 0%, var(--bg-deep) 100%)'
        }}
      >
        {/* Mandala Background */}
        <MandalaBackground />
        
        {/* Compass Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img 
            src={rellioLogo} 
            alt="" 
            className="w-96 h-96 object-contain opacity-[0.08] scale-150"
            aria-hidden="true"
          />
        </div>
        
        {/* Floating Gold Dust Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 12 }, (_, i) => (
            <span 
              key={i}
              className="absolute w-1 h-1 bg-gold/20 rounded-full animate-dust-drift"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 1.2}s`,
                animationDuration: `${18 + Math.random() * 8}s`
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Main Headline with Split Styling */}
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-tight text-white drop-shadow-lg mb-6">
            Explore Sacred{' '}
            <span 
              className="text-gold font-bold"
              style={{
                textShadow: '0 0 18px rgba(212,175,55,0.45), 0 0 36px rgba(212,175,55,0.25)'
              }}
            >
              Scriptures
            </span>
          </h1>
          
          {/* Enhanced Subheading */}
          <p className="mt-6 max-w-2xl mx-auto text-xl text-text-muted leading-relaxed">
            Discover insights from multiple religious texts. Ask questions and receive guidance on spiritual topics.
          </p>
          
          {/* Gold CTA Buttons */}
          <div className="mt-12 flex items-center justify-center gap-6 flex-wrap">
            <button
              onClick={handleGetStarted}
              className="group relative overflow-hidden rounded-2xl px-8 py-4 bg-gold text-black font-semibold text-lg shadow-glow-gold hover:brightness-110 hover:shadow-[0_0_36px_rgba(212,175,55,0.55)] transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-2">
                ✨ Start Exploring
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-gold to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            
            <a 
              href="#how-it-works"
              className="rounded-2xl px-8 py-4 border-2 border-gold text-text-primary font-semibold text-lg hover:shadow-glow-gold hover:bg-gold/10 transition-all duration-300"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Sample Query Section */}
        <div className="mt-20 max-w-4xl mx-auto relative z-10">
          <Card 
            className="backdrop-blur-md border border-card-border shadow-card-shadow"
            style={{ background: 'var(--card)' }}
          >
            <CardHeader>
              <CardTitle className="text-text-primary flex items-center justify-center space-x-2">
                <MessageCircle className="w-5 h-5 text-teal" />
                <span>Ask Our AI Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={sampleQuery}
                onChange={(e) => setSampleQuery(e.target.value)}
                className="bg-bg-indigo/50 border-card-border text-text-primary placeholder:text-text-muted backdrop-blur-sm"
                placeholder="What is the meaning of life?"
              />
              {sampleResponse && (
                <div className="bg-bg-indigo/30 rounded-xl p-4 text-text-muted text-left border border-card-border backdrop-blur-sm">
                  <p className="text-sm leading-relaxed">{sampleResponse}</p>
                </div>
              )}
              <button
                onClick={handleGetStarted}
                className="w-full rounded-xl px-6 py-3 bg-teal text-black font-semibold hover:shadow-glow-teal hover:brightness-110 transition-all duration-300"
              >
                Start exploring now
              </button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* About Section - Majestic Two-Column Layout */}
      <section 
        id="about" 
        className="py-24 px-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-indigo) 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Symbolic Illustration */}
            <div className="relative">
              <div className="relative w-80 h-80 mx-auto">
                {/* Halo Effect */}
                <div 
                  className="absolute inset-0 rounded-full opacity-20"
                  style={{
                    background: 'radial-gradient(circle, var(--gold) 0%, transparent 70%)'
                  }}
                />
                {/* Sacred Book Symbol */}
                <div className="absolute inset-8 flex items-center justify-center">
                  <div className="relative">
                    <Book className="w-32 h-32 text-gold drop-shadow-lg" />
                    <div className="absolute -inset-4 border-2 border-gold/30 rounded-lg" />
                    <div className="absolute -inset-8 border border-gold/20 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mission Copy */}
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-sm uppercase tracking-widest text-gold mb-4">Our Sacred Mission</h2>
                <h3 className="font-display text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
                  Bridging Wisdom Across Traditions
                </h3>
              </div>
              <p className="font-serif text-xl text-text-muted leading-relaxed">
                Rellio is an AI-driven platform that provides access to sacred scriptures from multiple religious traditions. 
                Our mission is to foster understanding, dialogue, and spiritual growth through thoughtful engagement with 
                religious texts, guided by advanced AI that respects the depth and nuance of each tradition.
              </p>
              <div className="pt-4">
                <button 
                  onClick={handleGetStarted}
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gold text-gold hover:bg-gold hover:text-black font-semibold rounded-xl transition-all duration-300 hover:shadow-glow-gold"
                >
                  Explore Sacred Texts
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Glass Cards with Compass Geometry */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-serif text-sm uppercase tracking-widest text-gold mb-4">Your Journey</h2>
            <h3 className="font-display text-4xl lg:text-5xl font-bold text-text-primary mb-6">
              How It Works
            </h3>
            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              Discover sacred wisdom through our intuitive four-step process
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="group relative">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 text-center shadow-card-shadow hover:shadow-glow-gold transition-all duration-300 hover:-translate-y-2"
                style={{ background: 'var(--card)' }}
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-gold flex items-center justify-center bg-gold/10 group-hover:bg-gold/20 transition-colors duration-300">
                    <Book className="w-8 h-8 text-gold" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-teal text-black rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                </div>
                <h4 className="font-display text-xl font-semibold text-text-primary mb-3">Select Text</h4>
                <p className="text-text-muted leading-relaxed">
                  Choose from Bible, Quran, Torah, Bhagavad Gita, and Buddhist texts
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 text-center shadow-card-shadow hover:shadow-glow-teal transition-all duration-300 hover:-translate-y-2"
                style={{ background: 'var(--card)' }}
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-teal flex items-center justify-center bg-teal/10 group-hover:bg-teal/20 transition-colors duration-300">
                    <Search className="w-8 h-8 text-teal" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gold text-black rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                </div>
                <h4 className="font-display text-xl font-semibold text-text-primary mb-3">Navigate Chapters</h4>
                <p className="text-text-muted leading-relaxed">
                  Browse through chapters and verses with intelligent navigation
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 text-center shadow-card-shadow hover:shadow-glow-gold transition-all duration-300 hover:-translate-y-2"
                style={{ background: 'var(--card)' }}
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-gold flex items-center justify-center bg-gold/10 group-hover:bg-gold/20 transition-colors duration-300">
                    <MessageCircle className="w-8 h-8 text-gold" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-teal text-black rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                </div>
                <h4 className="font-display text-xl font-semibold text-text-primary mb-3">Ask AI</h4>
                <p className="text-text-muted leading-relaxed">
                  Get insights from specialized religious scholar AI personas
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="group relative">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 text-center shadow-card-shadow hover:shadow-glow-teal transition-all duration-300 hover:-translate-y-2"
                style={{ background: 'var(--card)' }}
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full border-2 border-teal flex items-center justify-center bg-teal/10 group-hover:bg-teal/20 transition-colors duration-300">
                    <Users className="w-8 h-8 text-teal" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gold text-black rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                </div>
                <h4 className="font-display text-xl font-semibold text-text-primary mb-3">Discuss</h4>
                <p className="text-text-muted leading-relaxed">
                  Engage in meaningful dialogue about spiritual topics
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - 6-Card Compass Grid */}
      <section 
        id="features" 
        className="py-24 px-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--bg-indigo) 0%, var(--bg-deep) 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-serif text-sm uppercase tracking-widest text-gold mb-4">Core Features</h2>
            <h3 className="font-display text-4xl lg:text-5xl font-bold text-text-primary mb-6">
              Powerful Tools for Spiritual Discovery
            </h3>
            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              Everything you need for comprehensive scripture study and AI-guided exploration
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 shadow-card-shadow hover:shadow-glow-gold hover:border-gold/40 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'var(--card)' }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-xl border-2 border-gold flex items-center justify-center bg-gold/10">
                    <Book className="w-6 h-6 text-gold" />
                  </div>
                  <h4 className="font-display text-xl font-semibold text-text-primary">Multi-Religious Texts</h4>
                </div>
                <p className="text-text-muted leading-relaxed">
                  Access to Bible, Quran, Torah, Hadith collections, Bhagavad Gita, and Buddhist Tripitaka
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 shadow-card-shadow hover:shadow-glow-teal hover:border-teal/40 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'var(--card)' }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-xl border-2 border-teal flex items-center justify-center bg-teal/10">
                    <MessageCircle className="w-6 h-6 text-teal" />
                  </div>
                  <h4 className="font-display text-xl font-semibold text-text-primary">AI Guidance</h4>
                </div>
                <p className="text-text-muted leading-relaxed">
                  Specialized scholar personas for each tradition provide contextual insights
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 shadow-card-shadow hover:shadow-glow-gold hover:border-gold/40 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'var(--card)' }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-xl border-2 border-gold flex items-center justify-center bg-gold/10">
                    <Search className="w-6 h-6 text-gold" />
                  </div>
                  <h4 className="font-display text-xl font-semibold text-text-primary">Smart Search</h4>
                </div>
                <p className="text-text-muted leading-relaxed">
                  Find specific verses, themes, and concepts across all religious texts
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 shadow-card-shadow hover:shadow-glow-teal hover:border-teal/40 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'var(--card)' }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-xl border-2 border-teal flex items-center justify-center bg-teal/10">
                    <Play className="w-6 h-6 text-teal" />
                  </div>
                  <h4 className="font-display text-xl font-semibold text-text-primary">Voice Playback</h4>
                </div>
                <p className="text-text-muted leading-relaxed">
                  Listen to verses and AI responses with high-quality text-to-speech
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 shadow-card-shadow hover:shadow-glow-gold hover:border-gold/40 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'var(--card)' }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-xl border-2 border-gold flex items-center justify-center bg-gold/10">
                    <Users className="w-6 h-6 text-gold" />
                  </div>
                  <h4 className="font-display text-xl font-semibold text-text-primary">Personal Progress</h4>
                </div>
                <p className="text-text-muted leading-relaxed">
                  Track your reading progress and save meaningful conversations
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group">
              <div 
                className="backdrop-blur-md border border-card-border rounded-2xl p-8 shadow-card-shadow hover:shadow-glow-teal hover:border-teal/40 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'var(--card)' }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-xl border-2 border-teal flex items-center justify-center bg-teal/10">
                    <Star className="w-6 h-6 text-teal" />
                  </div>
                  <h4 className="font-display text-xl font-semibold text-text-primary">Multi-Perspective</h4>
                </div>
                <p className="text-text-muted leading-relaxed">
                  Compare interpretations across different religious traditions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Glass Accordion */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-serif text-sm uppercase tracking-widest text-gold mb-4">Questions</h2>
            <h3 className="font-display text-4xl lg:text-5xl font-bold text-text-primary mb-6">
              Frequently Asked Questions
            </h3>
            <p className="text-xl text-text-muted">
              Everything you need to know about using Rellio
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-6">
            <AccordionItem 
              value="item-1" 
              className="backdrop-blur-md border border-card-border rounded-2xl overflow-hidden shadow-card-shadow"
              style={{ background: 'var(--card)' }}
            >
              <AccordionTrigger className="text-text-primary px-8 py-6 hover:no-underline hover:bg-gold/5 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none transition-colors font-display text-lg font-semibold">
                How does the AI interpret scriptures?
              </AccordionTrigger>
              <AccordionContent className="text-text-muted px-8 pb-6 leading-relaxed">
                Our AI is trained on authentic religious texts and scholarly interpretations. Each religious tradition has a specialized persona (Christian Priest, Islamic Mufti, Jewish Rabbi, Hindu Guru, Buddhist Monk) that provides contextually appropriate guidance while respecting the sacred nature of the texts.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem 
              value="item-2" 
              className="backdrop-blur-md border border-card-border rounded-2xl overflow-hidden shadow-card-shadow"
              style={{ background: 'var(--card)' }}
            >
              <AccordionTrigger className="text-text-primary px-8 py-6 hover:no-underline hover:bg-gold/5 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none transition-colors font-display text-lg font-semibold">
                Which texts are supported?
              </AccordionTrigger>
              <AccordionContent className="text-text-muted px-8 pb-6 leading-relaxed">
                We support major religious texts including the Christian Bible, Islamic Quran and Hadith collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah), Jewish Torah, Hindu Bhagavad Gita and Upanishads, and Buddhist Tripitaka texts.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem 
              value="item-3" 
              className="backdrop-blur-md border border-card-border rounded-2xl overflow-hidden shadow-card-shadow"
              style={{ background: 'var(--card)' }}
            >
              <AccordionTrigger className="text-text-primary px-8 py-6 hover:no-underline hover:bg-gold/5 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none transition-colors font-display text-lg font-semibold">
                Is this suitable for all faith backgrounds?
              </AccordionTrigger>
              <AccordionContent className="text-text-muted px-8 pb-6 leading-relaxed">
                Yes, Rellio is designed to be respectful and inclusive. Whether you're deepening your understanding of your own faith tradition or learning about others, our platform promotes interfaith dialogue and mutual understanding.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem 
              value="item-4" 
              className="backdrop-blur-md border border-card-border rounded-2xl overflow-hidden shadow-card-shadow"
              style={{ background: 'var(--card)' }}
            >
              <AccordionTrigger className="text-text-primary px-8 py-6 hover:no-underline hover:bg-gold/5 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none transition-colors font-display text-lg font-semibold">
                How accurate are the AI responses?
              </AccordionTrigger>
              <AccordionContent className="text-text-muted px-8 pb-6 leading-relaxed">
                Our AI draws from authentic religious texts and established scholarly interpretations. However, we always recommend consulting with religious authorities and original texts for matters of faith and practice. The AI serves as a learning companion, not a replacement for traditional religious guidance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem 
              value="item-5" 
              className="backdrop-blur-md border border-card-border rounded-2xl overflow-hidden shadow-card-shadow"
              style={{ background: 'var(--card)' }}
            >
              <AccordionTrigger className="text-text-primary px-8 py-6 hover:no-underline hover:bg-gold/5 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none transition-colors font-display text-lg font-semibold">
                Can I save my conversations and progress?
              </AccordionTrigger>
              <AccordionContent className="text-text-muted px-8 pb-6 leading-relaxed">
                Yes, registered users can save their conversations, bookmark meaningful passages, and track their reading progress across all religious texts. Your data is kept private and secure.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Contact Section - Gold-Styled Form */}
      <section 
        id="contact" 
        className="py-24 px-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-indigo) 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-serif text-sm uppercase tracking-widest text-gold mb-4">Connect</h2>
            <h3 className="font-display text-4xl lg:text-5xl font-bold text-text-primary mb-6">
              Contact Us
            </h3>
            <p className="text-xl text-text-muted">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h4 className="font-display text-2xl font-semibold text-text-primary mb-8">Get in Touch</h4>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl border-2 border-gold flex items-center justify-center bg-gold/10">
                      <Mail className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Email</p>
                      <p className="text-text-muted">hello@rellio.app</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl border-2 border-teal flex items-center justify-center bg-teal/10">
                      <Phone className="w-6 h-6 text-teal" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Phone</p>
                      <p className="text-text-muted">+1 (555) RELLIO-1</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl border-2 border-gold flex items-center justify-center bg-gold/10">
                      <MapPin className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Global Access</p>
                      <p className="text-text-muted">Digital Platform - Serving Worldwide</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-display text-lg font-semibold text-text-primary mb-6">Follow Our Journey</h5>
                <div className="flex space-x-4">
                  <button className="w-12 h-12 rounded-xl border-2 border-gold text-gold hover:bg-gold hover:text-black transition-colors duration-300 flex items-center justify-center">
                    <Twitter className="w-5 h-5" />
                  </button>
                  <button className="w-12 h-12 rounded-xl border-2 border-teal text-teal hover:bg-teal hover:text-black transition-colors duration-300 flex items-center justify-center">
                    <Facebook className="w-5 h-5" />
                  </button>
                  <button className="w-12 h-12 rounded-xl border-2 border-gold text-gold hover:bg-gold hover:text-black transition-colors duration-300 flex items-center justify-center">
                    <Instagram className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div 
              className="backdrop-blur-md border border-card-border rounded-2xl p-8 shadow-card-shadow"
              style={{ background: 'var(--card)' }}
            >
              <div className="mb-6">
                <h4 className="font-display text-xl font-semibold text-text-primary mb-2">Send us a Message</h4>
                <p className="text-text-muted">
                  Share your thoughts, questions, or feedback with our team.
                </p>
              </div>
              <form className="space-y-6">
                <div>
                  <Input 
                    placeholder="Your Name" 
                    className="bg-bg-indigo/50 border-card-border text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold backdrop-blur-sm rounded-xl h-12"
                  />
                </div>
                <div>
                  <Input 
                    placeholder="Email Address" 
                    type="email"
                    className="bg-bg-indigo/50 border-card-border text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold backdrop-blur-sm rounded-xl h-12"
                  />
                </div>
                <div>
                  <textarea 
                    placeholder="Your Message"
                    rows={4}
                    className="w-full px-4 py-3 bg-bg-indigo/50 border border-card-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none backdrop-blur-sm resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full px-6 py-4 bg-gold text-black font-semibold rounded-xl hover:shadow-glow-gold hover:brightness-110 transition-all duration-300"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Darker Band with Compass Watermark */}
      <footer 
        className="relative py-16 px-6 border-t border-card-border overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, var(--bg-indigo) 0%, var(--bg-deep) 100%)'
        }}
      >
        {/* Compass Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img 
            src={rellioLogo} 
            alt="" 
            className="w-64 h-64 object-contain opacity-[0.03] scale-150"
            aria-hidden="true"
          />
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <img src={rellioLogo} alt="Rellio Logo" className="w-10 h-10" />
                <span className="text-2xl font-bold text-text-primary font-display">Rellio</span>
              </div>
              <p className="text-text-muted leading-relaxed mb-6">
                Guiding spiritual discovery through AI-powered insights and multi-religious wisdom.
              </p>
              <p className="text-sm text-gold font-serif italic">
                "Guiding You Through Sacred Wisdom"
              </p>
            </div>

            {/* Platform Links */}
            <div>
              <h4 className="text-text-primary font-display font-semibold mb-6">Platform</h4>
              <ul className="space-y-3 text-text-muted">
                <li><a href="#about" className="hover:text-gold transition-colors duration-300">About</a></li>
                <li><a href="#features" className="hover:text-gold transition-colors duration-300">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-gold transition-colors duration-300">How It Works</a></li>
                <li><a href="#faq" className="hover:text-gold transition-colors duration-300">FAQ</a></li>
              </ul>
            </div>

            {/* Sacred Texts */}
            <div>
              <h4 className="text-text-primary font-display font-semibold mb-6">Sacred Texts</h4>
              <ul className="space-y-3 text-text-muted">
                <li><a href="#" className="hover:text-teal transition-colors duration-300">Bible</a></li>
                <li><a href="#" className="hover:text-teal transition-colors duration-300">Quran & Hadith</a></li>
                <li><a href="#" className="hover:text-teal transition-colors duration-300">Torah</a></li>
                <li><a href="#" className="hover:text-teal transition-colors duration-300">Hindu Texts</a></li>
                <li><a href="#" className="hover:text-teal transition-colors duration-300">Buddhist Texts</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-text-primary font-display font-semibold mb-6">Support</h4>
              <ul className="space-y-3 text-text-muted">
                <li><a href="#contact" className="hover:text-gold transition-colors duration-300">Contact</a></li>
                <li><a href="#" className="hover:text-gold transition-colors duration-300">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gold transition-colors duration-300">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gold transition-colors duration-300">Help Center</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-card-border pt-8 flex flex-col lg:flex-row justify-between items-center gap-6">
            <p className="text-text-muted text-center lg:text-left">
              © 2025 Rellio. All rights reserved. Built with reverence for all spiritual traditions.
            </p>
            <div className="flex items-center space-x-8">
              <a href="#" className="text-text-muted hover:text-gold transition-colors duration-300">Privacy</a>
              <a href="#" className="text-text-muted hover:text-gold transition-colors duration-300">Terms</a>
              <a href="#" className="text-text-muted hover:text-gold transition-colors duration-300">Support</a>
              <div className="flex items-center space-x-4">
                <span className="text-text-muted text-sm">Follow:</span>
                <div className="flex space-x-3">
                  <button className="w-8 h-8 rounded-lg border border-gold/30 text-gold hover:bg-gold hover:text-black transition-colors duration-300 flex items-center justify-center">
                    <Twitter className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 rounded-lg border border-teal/30 text-teal hover:bg-teal hover:text-black transition-colors duration-300 flex items-center justify-center">
                    <Facebook className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}