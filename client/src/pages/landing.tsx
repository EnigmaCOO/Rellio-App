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
import rellioLogo from "@assets/image_1751817332000.png";
import { useQuery } from "@tanstack/react-query";

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
              <Flame className="w-8 h-8 text-neon-blue animate-neon-pulse" />
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

      {/* Hero Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Floating religious symbols */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-20"><CrossSymbol /></div>
            <div className="absolute top-40 right-20"><CrescentSymbol /></div>
            <div className="absolute bottom-40 left-32"><StarOfDavidSymbol /></div>
            <div className="absolute bottom-20 right-32"><DharmaWheelSymbol /></div>
            <div className="absolute top-60 left-1/2"><OmSymbol /></div>
          </div>

          {/* Main content */}
          <div className="relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Explore Sacred
              <span className="block neon-text">Scriptures</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
              Discover insights from multiple religious texts. Ask questions and receive guidance on spiritual topics.
            </p>
            
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              className="bg-neon-blue hover:bg-neon-cyan text-white px-12 py-4 text-lg rounded-full neon-border animate-neon-pulse"
            >
              Get Started
            </Button>
          </div>

          {/* Sample Query Section */}
          <div className="mt-16">
            <Card className="holographic-card max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-neon-cyan" />
                  <span>Ask Our AI Guide</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={sampleQuery}
                  onChange={(e) => setSampleQuery(e.target.value)}
                  className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400"
                  placeholder="What is the meaning of life?"
                />
                {sampleResponse && (
                  <div className="bg-indigo-800/50 rounded-lg p-4 text-gray-300 text-left">
                    <p className="text-sm leading-relaxed">{sampleResponse}</p>
                  </div>
                )}
                <Button 
                  onClick={handleGetStarted}
                  className="w-full bg-neon-cyan hover:bg-holographic-pink text-deep-indigo"
                >
                  Start exploring now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 bg-indigo-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">About Rellio</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Rellio is an AI-driven platform that provides access to sacred scriptures from multiple religious traditions. 
            Our mission is to foster understanding, dialogue, and spiritual growth through thoughtful engagement with 
            religious texts, guided by advanced AI that respects the depth and nuance of each tradition.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Card className="holographic-card text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-neon-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <Book className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white">Select Text</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Choose from Bible, Quran, Torah, Bhagavad Gita, and Buddhist texts</p>
              </CardContent>
            </Card>

            <Card className="holographic-card text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-neon-cyan rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-deep-indigo" />
                </div>
                <CardTitle className="text-white">Navigate Chapters</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Browse through chapters and verses with intelligent navigation</p>
              </CardContent>
            </Card>

            <Card className="holographic-card text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-neon-purple rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white">Ask AI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Get insights from specialized religious scholar AI personas</p>
              </CardContent>
            </Card>

            <Card className="holographic-card text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-holographic-pink rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-white">Discuss</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Engage in meaningful dialogue about spiritual topics</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-indigo-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="holographic-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Book className="w-5 h-5 text-neon-blue" />
                  <span>Multi-Religious Texts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Access to Bible, Quran, Torah, Hadith collections, Bhagavad Gita, and Buddhist Tripitaka</p>
              </CardContent>
            </Card>

            <Card className="holographic-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-neon-cyan" />
                  <span>AI Guidance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Specialized scholar personas for each tradition provide contextual insights</p>
              </CardContent>
            </Card>

            <Card className="holographic-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Search className="w-5 h-5 text-neon-purple" />
                  <span>Smart Search</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Find specific verses, themes, and concepts across all religious texts</p>
              </CardContent>
            </Card>

            <Card className="holographic-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Play className="w-5 h-5 text-holographic-pink" />
                  <span>Voice Playback</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Listen to verses and AI responses with high-quality text-to-speech</p>
              </CardContent>
            </Card>

            <Card className="holographic-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-holographic-green" />
                  <span>Personal Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Track your reading progress and save meaningful conversations</p>
              </CardContent>
            </Card>

            <Card className="holographic-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Star className="w-5 h-5 text-cosmic-gold" />
                  <span>Multi-Perspective</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">Compare interpretations across different religious traditions</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="holographic-card">
              <AccordionTrigger className="text-white px-6">How does the AI interpret scriptures?</AccordionTrigger>
              <AccordionContent className="text-gray-300 px-6">
                Our AI is trained on authentic religious texts and scholarly interpretations. Each religious tradition has a specialized persona (Christian Priest, Islamic Mufti, Jewish Rabbi, Hindu Guru, Buddhist Monk) that provides contextually appropriate guidance while respecting the sacred nature of the texts.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="holographic-card">
              <AccordionTrigger className="text-white px-6">Which texts are supported?</AccordionTrigger>
              <AccordionContent className="text-gray-300 px-6">
                We support major religious texts including the Christian Bible, Islamic Quran and Hadith collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah), Jewish Torah, Hindu Bhagavad Gita and Upanishads, and Buddhist Tripitaka texts.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="holographic-card">
              <AccordionTrigger className="text-white px-6">Is this suitable for all faith backgrounds?</AccordionTrigger>
              <AccordionContent className="text-gray-300 px-6">
                Yes, Rellio is designed to be respectful and inclusive. Whether you're deepening your understanding of your own faith tradition or learning about others, our platform promotes interfaith dialogue and mutual understanding.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="holographic-card">
              <AccordionTrigger className="text-white px-6">How accurate are the AI responses?</AccordionTrigger>
              <AccordionContent className="text-gray-300 px-6">
                Our AI draws from authentic religious texts and established scholarly interpretations. However, we always recommend consulting with religious authorities and original texts for matters of faith and practice. The AI serves as a learning companion, not a replacement for traditional religious guidance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="holographic-card">
              <AccordionTrigger className="text-white px-6">Can I save my conversations and progress?</AccordionTrigger>
              <AccordionContent className="text-gray-300 px-6">
                Yes, registered users can save their conversations, bookmark meaningful passages, and track their reading progress across all religious texts. Your data is kept private and secure.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-indigo-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Contact Us</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-6">Get in Touch</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-300">
                  <Mail className="w-5 h-5 text-neon-blue" />
                  <span>hello@rellio.app</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <Phone className="w-5 h-5 text-neon-cyan" />
                  <span>+1 (555) RELLIO-1</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-300">
                  <MapPin className="w-5 h-5 text-neon-purple" />
                  <span>Digital Platform - Serving Globally</span>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-lg font-semibold text-white mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                  <Button size="sm" variant="outline" className="border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-white">
                    <Twitter className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-deep-indigo">
                    <Facebook className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-neon-purple text-neon-purple hover:bg-neon-purple hover:text-white">
                    <Instagram className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Card className="holographic-card">
              <CardHeader>
                <CardTitle className="text-white">Send us a Message</CardTitle>
                <CardDescription className="text-gray-300">
                  We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder="Your Name" 
                  className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400"
                />
                <Input 
                  placeholder="Email Address" 
                  type="email"
                  className="bg-indigo-900 border-neon-blue text-white placeholder:text-gray-400"
                />
                <textarea 
                  placeholder="Your Message"
                  rows={4}
                  className="w-full px-3 py-2 bg-indigo-900 border border-neon-blue rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                />
                <Button className="w-full bg-neon-blue hover:bg-neon-cyan text-white">
                  Send Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-indigo-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Flame className="w-8 h-8 text-neon-blue" />
                <h3 className="text-xl font-bold text-white">Rellio</h3>
              </div>
              <p className="text-gray-400">
                Bridging wisdom across religious traditions through AI-powered spiritual guidance.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Explore</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#about" className="hover:text-neon-cyan transition-colors">About</a></li>
                <li><a href="#how-it-works" className="hover:text-neon-cyan transition-colors">How It Works</a></li>
                <li><a href="#features" className="hover:text-neon-cyan transition-colors">Features</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#faq" className="hover:text-neon-cyan transition-colors">FAQ</a></li>
                <li><a href="#contact" className="hover:text-neon-cyan transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-neon-cyan transition-colors">Help Center</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-neon-cyan transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-neon-cyan transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-neon-cyan transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-indigo-800 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 Rellio. All rights reserved. Built with respect for all faith traditions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}