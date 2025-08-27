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
  User,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Sparkles
} from "lucide-react";
import { FaTiktok } from "react-icons/fa";
import rellioLogo from "@assets/Rellio logo_1756158287035.png";
import { CompassWatermark } from "@/components/CompassWatermark";
import { MandalaPattern } from "@/components/MandalaPattern";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-64 backdrop-blur-md border-l border-gold/20 p-6"
           style={{
             background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(212,175,55,0.05) 100%)'
           }}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-serif text-text-primary">Menu</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-text-primary hover:bg-gold/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="space-y-4">
          <a href="#about" className="block text-text-primary hover:text-gold transition-colors font-light tracking-wide" onClick={onClose}>
            About
          </a>
          <a href="#features" className="block text-text-primary hover:text-gold transition-colors font-light tracking-wide" onClick={onClose}>
            Features
          </a>
          <a href="#faq" className="block text-text-primary hover:text-gold transition-colors font-light tracking-wide" onClick={onClose}>
            FAQ
          </a>
        </nav>
      </div>
    </div>
  );
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sampleQuery, setSampleQuery] = useState("What is the meaning of peace across religious traditions?");
  const [sampleResponse, setSampleResponse] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Simulate AI response for demo
    const response = "Peace is a universal aspiration found in all religious teachings. The Hebrew word 'Shalom' represents complete wholeness and harmony. Islamic 'Salaam' conveys similar concepts of peace and submission to divine will. Hindu traditions speak of 'Shanti' - inner peace that comes from spiritual realization. Buddhist teachings emphasize inner peace through mindfulness and liberation from suffering. These teachings show how different cultures approach the universal human longing for peace and harmony.";
    
    setTimeout(() => {
      setSampleResponse(response);
    }, 2000);
  }, [sampleQuery]);

  useEffect(() => {
    // Scroll reveal animation observer
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-float-up');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all sections for scroll reveal
    const sections = document.querySelectorAll('section[data-scroll-reveal]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const handleGetStarted = () => {
    setLocation('/dashboard');
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        background: `
          linear-gradient(135deg, #060A1A 0%, #0A0F29 50%, #060A1A 100%),
          radial-gradient(ellipse at 30% 40%, rgba(212, 175, 55, 0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 60%, rgba(0, 213, 255, 0.08) 0%, transparent 50%)
        `
      }}
    >
      {/* Navigation */}
      <nav className="relative z-40 py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={rellioLogo} alt="Rellio" className="w-10 h-10 object-contain" />
            <h1 className="text-xl font-serif text-text-primary font-light tracking-wider">Rellio</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#about" className="text-text-muted hover:text-gold transition-colors font-light tracking-wide">About</a>
            <a href="#features" className="text-text-muted hover:text-gold transition-colors font-light tracking-wide">Features</a>
            <a href="#faq" className="text-text-muted hover:text-gold transition-colors font-light tracking-wide">FAQ</a>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-text-primary hover:bg-gold/10"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden">
        {/* Background Elements */}
        <CompassWatermark />
        <MandalaPattern />
        
        {/* Floating Golden Dust */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 25 }, (_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-gold/30 rounded-full animate-dust-drift"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${12 + Math.random() * 6}s`
              }}
            />
          ))}
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Main Logo with Animation */}
          <div className="mb-12 animate-float-up">
            <img 
              src={rellioLogo} 
              alt="Rellio Compass" 
              className="w-40 h-40 md:w-56 md:h-56 mx-auto object-contain transition-all duration-1000 motion-safe:animate-pulse-glow-gold" 
              style={{
                filter: 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.4))',
              }}
            />
          </div>

          {/* Hero Headlines */}
          <div className="space-y-6 mb-12 animate-float-up" style={{ animationDelay: '0.3s' }}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-light text-text-primary leading-tight">
              Explore Sacred{' '}
              <span 
                className="text-gold font-normal"
                style={{
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.3)'
                }}
              >
                Scriptures
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-text-muted font-light max-w-4xl mx-auto leading-relaxed">
              Discover insights across traditions. Ask, compare, and learn with scholar-grade AI.
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-float-up" style={{ animationDelay: '0.6s' }}>
            <Button
              onClick={handleGetStarted}
              className="group relative px-8 py-4 text-lg font-medium transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%)',
                color: '#0A0F29',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 40px rgba(212, 175, 55, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.4)';
              }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Exploring
            </Button>
            
            <Button
              variant="outline"
              className="px-8 py-4 text-lg font-light border-gold/50 text-gold hover:bg-gold/10 hover:border-gold transition-all duration-300"
              style={{
                background: 'transparent',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6" data-scroll-reveal>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Sacred Illustration */}
            <div className="relative">
              <div className="relative group">
                <div 
                  className="w-80 h-80 mx-auto rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105"
                  style={{
                    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(212, 175, 55, 0.2)'
                  }}
                >
                  <BookOpen className="w-32 h-32 text-gold opacity-60" />
                  <div className="absolute inset-0 rounded-full animate-pulse-glow-gold opacity-50"></div>
                </div>
              </div>
            </div>

            {/* Right: Mission Text */}
            <div className="space-y-8">
              <div>
                <h2 className="text-sm font-serif text-gold uppercase tracking-[0.3em] mb-4 opacity-90">
                  About Rellio
                </h2>
                <h3 className="text-4xl md:text-5xl font-serif font-light text-text-primary leading-tight mb-6">
                  A Bridge Between{' '}
                  <span className="text-gold">Sacred Traditions</span>
                </h3>
              </div>
              
              <p className="text-lg text-text-muted leading-relaxed font-light">
                Rellio is an AI-driven platform that provides access to sacred scriptures from 
                multiple religious traditions. Our mission is to foster understanding, dialogue, and 
                spiritual growth through thoughtful engagement with religious texts that 
                respects the depth and nuance of each tradition.
              </p>
              
              <p className="text-lg text-text-muted leading-relaxed font-light">
                Whether you're deepening your own faith or exploring the wisdom of other traditions, 
                our AI guides offer scholarly insights while honoring the sacred nature of these timeless teachings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Demo Section */}
      <section className="py-16 px-6" data-scroll-reveal>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm font-serif text-gold uppercase tracking-[0.3em] mb-4 opacity-90">
              Experience AI Wisdom
            </h2>
            <h3 className="text-3xl md:text-4xl font-serif font-light text-text-primary leading-tight">
              Ask Our Sacred <span className="text-gold">Scholars</span>
            </h3>
          </div>
          
          <Card 
            className="border-gold/20 backdrop-blur-md shadow-card-shadow"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(212, 175, 55, 0.18)'
            }}
          >
            <CardHeader>
              <CardTitle className="text-gold flex items-center justify-center space-x-2 text-xl font-serif font-light">
                <MessageCircle className="w-6 h-6" />
                <span>Ask Our AI Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                value={sampleQuery}
                onChange={(e) => setSampleQuery(e.target.value)}
                className="backdrop-blur-sm border-gold/20 text-text-primary placeholder:text-text-muted/50 text-lg py-3 font-light"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                }}
                placeholder="What wisdom do you seek?"
              />
              {sampleResponse && (
                <div 
                  className="rounded-xl p-6 text-text-primary text-left border backdrop-blur-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(212, 175, 55, 0.15)'
                  }}
                >
                  <p className="leading-relaxed font-light">{sampleResponse}</p>
                </div>
              )}
              <Button
                onClick={handleGetStarted}
                className="w-full py-3 text-lg font-medium transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%)',
                  color: '#0A0F29',
                  boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(212, 175, 55, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.4)';
                }}
              >
                Begin Your Sacred Journey
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section with Glassmorphism */}
      <section id="features" className="py-24 px-6" data-scroll-reveal>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-serif text-gold uppercase tracking-[0.3em] mb-4 opacity-90">
              Sacred Features
            </h2>
            <h3 className="text-4xl md:text-5xl font-serif font-light text-text-primary leading-tight">
              How It <span className="text-gold">Works</span>
            </h3>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: BookOpen, title: "Sacred Texts", description: "Access scriptures from multiple religious traditions with authentic translations" },
              { icon: Compass, title: "AI Guidance", description: "Scholar-grade AI personas provide contextual insights for each tradition" },
              { icon: MessageCircle, title: "Deep Dialogue", description: "Engage in meaningful conversations about spiritual teachings and wisdom" },
              { icon: Volume2, title: "Voice Interaction", description: "Listen and speak naturally with voice-enabled spiritual guidance" },
              { icon: Search, title: "Wisdom Search", description: "Find relevant passages and teachings across all sacred texts instantly" },
              { icon: TrendingUp, title: "Progress Tracking", description: "Monitor your spiritual journey and reading milestones" },
              { icon: Eye, title: "Multi-Perspective", description: "Compare interpretations and insights across different religious views" },
              { icon: Users, title: "Community", description: "Connect with fellow seekers on their spiritual journeys" }
            ].map((feature, index) => (
              <div key={index} className="group text-center">
                <div 
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-gold"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.2)'
                  }}
                >
                  <feature.icon className="w-8 h-8 text-gold transition-all duration-300 group-hover:text-yellow-300" />
                </div>
                <h4 className="text-xl font-serif text-text-primary mb-3 font-light">{feature.title}</h4>
                <p className="text-text-muted text-sm leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section with Glassmorphism */}
      <section id="faq" className="py-24 px-6" data-scroll-reveal>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-serif text-gold uppercase tracking-[0.3em] mb-4 opacity-90">
              Sacred Wisdom
            </h2>
            <h3 className="text-4xl md:text-5xl font-serif font-light text-text-primary leading-tight mb-8">
              Frequently Asked <span className="text-gold">Questions</span>
            </h3>
            <p className="text-xl text-text-muted font-light">
              Everything you need to know about using Rellio
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-6">
            {[
              {
                q: "What religious texts are available on Rellio?",
                a: "Rellio provides access to major religious scriptures including the Bible (various translations), Quran, Torah, Hadith collections, Bhagavad Gita, Upanishads, and Buddhist Tripitaka texts."
              },
              {
                q: "How does the AI guidance work?",
                a: "Our AI features specialized religious scholar personas for each tradition - Islamic Mufti, Christian Priest, Jewish Rabbi, Hindu Guru, and Buddhist Monk - providing contextually appropriate guidance while respecting the depth and nuance of each religious tradition."
              },
              {
                q: "Is Rellio suitable for people of all faiths?",
                a: "Yes, Rellio is designed to be inclusive and respectful of all religious traditions. Whether you're exploring your own faith more deeply or learning about other traditions, our platform provides balanced, scholarly perspectives."
              },
              {
                q: "Can I track my reading progress?",
                a: "Absolutely! Rellio includes a comprehensive progress tracking system that monitors your reading sessions, study time, chapter completions, and spiritual journey milestones across all religious traditions."
              },
              {
                q: "Does Rellio support voice interaction?",
                a: "Yes! Rellio features voice recognition for spoken questions and text-to-speech capabilities for audio playback of responses, making it accessible for different learning preferences and accessibility needs."
              }
            ].map((item, index) => (
              <AccordionItem 
                key={index}
                value={`item-${index + 1}`} 
                className="rounded-xl overflow-hidden backdrop-blur-md border-gold/20"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(212, 175, 55, 0.18)'
                }}
              >
                <AccordionTrigger className="px-6 py-4 text-text-primary hover:text-gold transition-colors font-serif font-light text-left">
                  <Compass className="w-4 h-4 mr-3 text-gold flex-shrink-0" />
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-text-muted font-light leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section with Dark Vignette */}
      <section 
        className="py-24 px-6"
        style={{
          background: `
            linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(212,175,55,0.1) 50%, rgba(0,0,0,0.4) 100%),
            radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)
          `
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-light text-text-primary mb-8 leading-tight">
            Begin Your Sacred <span className="text-gold">Journey</span>
          </h2>
          <p className="text-xl text-text-muted mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Explore sacred texts with AI-guided wisdom across multiple religious traditions
          </p>
          <Button
            onClick={handleGetStarted}
            className="px-12 py-6 text-xl font-medium transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%)',
              color: '#0A0F29',
              boxShadow: '0 0 30px rgba(212, 175, 55, 0.5)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 50px rgba(212, 175, 55, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(212, 175, 55, 0.5)';
            }}
          >
            <Sparkles className="w-6 h-6 mr-3" />
            Start Exploring Now
          </Button>
        </div>
      </section>

      {/* Contact Section with Glass Panel */}
      <section id="contact" className="py-24 px-6" data-scroll-reveal>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-serif text-gold uppercase tracking-[0.3em] mb-4 opacity-90">
              Connect With Us
            </h2>
            <h3 className="text-4xl md:text-5xl font-serif font-light text-text-primary leading-tight">
              Get in <span className="text-gold">Touch</span>
            </h3>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <h4 className="text-2xl font-serif text-text-primary mb-8 font-light">Sacred Connections</h4>
              
              <div className="space-y-6">
                {[
                  { icon: Mail, label: "hello@rellio.app" },
                  { icon: Phone, label: "+1 (555) RELLIO-1" },
                  { icon: MapPin, label: "Digital Platform - Serving Globally" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(212, 175, 55, 0.2)'
                      }}
                    >
                      <item.icon className="w-6 h-6 text-gold" />
                    </div>
                    <p className="text-text-primary font-light">{item.label}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-12">
                <h5 className="text-lg font-serif text-text-primary mb-4 font-light">Follow Our Journey</h5>
                <div className="flex space-x-4">
                  <a 
                    href="https://x.com/rellioapp?s=21&t=Ub4dLYhrpLTZ3jThvaFqHg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-glow-gold"
                    style={{
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <Twitter className="w-6 h-6 text-gold" />
                  </a>
                  <a 
                    href="https://www.facebook.com/share/161TMqcuiT/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-glow-gold"
                    style={{
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <Facebook className="w-6 h-6 text-gold" />
                  </a>
                  <a 
                    href="https://www.instagram.com/rellioapp?igsh=MXRremNtOGZka3pq&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-glow-gold"
                    style={{
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <Instagram className="w-6 h-6 text-gold" />
                  </a>
                  <a 
                    href="https://www.linkedin.com/company/rellioapp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-glow-gold"
                    style={{
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <Linkedin className="w-6 h-6 text-gold" />
                  </a>
                  <a 
                    href="https://www.tiktok.com/@rellioapp?_t=ZP-8zBWZQV6tnb&_r=1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-glow-gold"
                    style={{
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <FaTiktok className="w-6 h-6 text-gold" />
                  </a>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div>
              <Card 
                className="backdrop-blur-md border-gold/20 shadow-card-shadow"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(212, 175, 55, 0.18)'
                }}
              >
                <CardHeader>
                  <CardTitle className="text-text-primary text-xl font-serif font-light">Send us a Message</CardTitle>
                  <p className="text-text-muted font-light">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Your Name"
                    className="backdrop-blur-sm border-gold/20 text-text-primary placeholder:text-text-muted/50 font-light"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                    }}
                  />
                  <Input
                    placeholder="Email Address"
                    type="email"
                    className="backdrop-blur-sm border-gold/20 text-text-primary placeholder:text-text-muted/50 font-light"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                    }}
                  />
                  <textarea
                    placeholder="Your Message"
                    rows={4}
                    className="w-full px-3 py-2 backdrop-blur-sm border border-gold/20 rounded-md text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 font-light"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                    }}
                  />
                  <Button 
                    className="w-full py-3 font-medium transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%)',
                      color: '#0A0F29',
                      boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 30px rgba(212, 175, 55, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.4)';
                    }}
                  >
                    Send Sacred Message
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Compass Watermark */}
      <footer 
        className="py-16 px-6 border-t border-gold/20 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(212,175,55,0.05) 50%, rgba(0,0,0,0.6) 100%)'
        }}
      >
        <div className="absolute inset-0 opacity-[0.03]">
          <CompassWatermark />
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <img src={rellioLogo} alt="Rellio" className="w-8 h-8 object-contain" />
                <h3 className="text-lg font-serif text-text-primary font-light">Rellio</h3>
              </div>
              <p className="text-text-muted font-light text-sm leading-relaxed">
                Guiding you through sacred wisdom across all religious traditions.
              </p>
            </div>
            
            <div>
              <h4 className="text-text-primary font-serif mb-4 font-light">Explore</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="text-text-muted hover:text-gold transition-colors font-light">About</a></li>
                <li><a href="#features" className="text-text-muted hover:text-gold transition-colors font-light">Features</a></li>
                <li><a href="#faq" className="text-text-muted hover:text-gold transition-colors font-light">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-text-primary font-serif mb-4 font-light">Traditions</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-text-muted font-light">Christianity</span></li>
                <li><span className="text-text-muted font-light">Islam</span></li>
                <li><span className="text-text-muted font-light">Judaism</span></li>
                <li><span className="text-text-muted font-light">Hinduism</span></li>
                <li><span className="text-text-muted font-light">Buddhism</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-text-primary font-serif mb-4 font-light">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#contact" className="text-text-muted hover:text-gold transition-colors font-light">Contact</a></li>
                <li><span className="text-text-muted font-light">Support</span></li>
                <li><span className="text-text-muted font-light">Community</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gold/20 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-text-muted text-sm font-light">
              © 2024 Rellio. Guiding you through sacred wisdom.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/privacy" className="text-text-muted hover:text-gold transition-colors text-sm font-light">Privacy</a>
              <a href="/terms" className="text-text-muted hover:text-gold transition-colors text-sm font-light">Terms</a>
              <a href="#" className="text-text-muted hover:text-gold transition-colors text-sm font-light">Ethics</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}