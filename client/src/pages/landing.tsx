import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  BookOpen,
  MessageCircle,
  Users,
  Search,
  TrendingUp,
  Compass,
  Volume2,
  Eye,
  Play,
  Sparkles,
  Brain,
  Route,
  Target,
  Mail,
  Phone,
  Globe,
  Send,
} from "lucide-react";
import heroImage from "@assets/rellio-hero-latest.png";
import mobileHeroImage from "@assets/rellio-mobile-hero.png";
import compassLogo from "@assets/rellio-compass-logo.png";

export default function LandingPage({
  bgUrl = "/assets/rellio-hero.jpg",
  logoUrl = "/assets/rellio-logo-gold.png",
}: {
  bgUrl?: string;
  logoUrl?: string;
} = {}) {
  const [offset, setOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [, setLocation] = useLocation();
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroContainerRef = useRef<HTMLDivElement>(null);
  
  // Dynamic book positions with robust calculations
  const [bookPositions, setBookPositions] = useState({
    Torah: { top: 0, left: 0, width: 0, height: 0 },
    Quran: { top: 0, left: 0, width: 0, height: 0 },
    Bible: { top: 0, right: 0, width: 0, height: 0 },
    Tripitaka: { top: 0, left: 0, width: 0, height: 0 },
    "Bhagavad Gita": { top: 0, right: 0, width: 0, height: 0 }
  });

  useEffect(() => {
    if (prefersReduced) return;
    const onScroll = () => {
      const y = window.scrollY;
      setOffset(Math.min(y * 0.2, 80));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [prefersReduced]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  // Robust dynamic positioning with debounced resize handling
  useEffect(() => {
    // Debounce function to prevent excessive recalculations
    const debounce = (fn: () => void, delay: number) => {
      let timeout: NodeJS.Timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, delay);
      };
    };

    const updateBookPositions = () => {
      if (!heroContainerRef.current) return;
      
      const hero = heroContainerRef.current;
      const { width, height } = hero.getBoundingClientRect();
      
      // Base calculations on image's natural aspect ratio
      const baseWidth = 1200; // Natural width of rellio-hero.jpg
      const scale = width / baseWidth;
      const offset = window.innerWidth < 640 ? 8 : 12; // Mobile vs desktop
      
      // Define proportional coordinates for each book relative to image
      const bookCoords = {
        Torah: { topPercent: 0.15, leftPercent: 0.25, baseWidth: 28, baseHeight: 36 },
        Quran: { topPercent: 0.08, leftPercent: 0.5, baseWidth: 32, baseHeight: 40 },
        Bible: { topPercent: 0.15, rightPercent: 0.25, baseWidth: 28, baseHeight: 36 },
        Tripitaka: { bottomPercent: 0.25, leftPercent: 0.2, baseWidth: 26, baseHeight: 34 },
        "Bhagavad Gita": { bottomPercent: 0.25, rightPercent: 0.2, baseWidth: 30, baseHeight: 38 }
      };
      
      const newPositions: typeof bookPositions = {};
      
      Object.entries(bookCoords).forEach(([bookName, coords]) => {
        const scaledWidth = coords.baseWidth * scale + offset * 2;
        const scaledHeight = coords.baseHeight * scale + offset * 2;
        
        newPositions[bookName as keyof typeof bookPositions] = {
          top: coords.topPercent ? height * coords.topPercent - offset : 
               coords.bottomPercent ? height - (height * coords.bottomPercent) - scaledHeight + offset : 0,
          left: coords.leftPercent ? width * coords.leftPercent - offset - (scaledWidth / 2) : 0,
          right: coords.rightPercent ? width * coords.rightPercent - offset : undefined,
          width: scaledWidth,
          height: scaledHeight
        };
      });
      
      setBookPositions(newPositions);
      
      // Debug logging
      console.log('Updated book positions:', {
        containerSize: { width, height },
        scale,
        offset,
        positions: newPositions
      });
    };
    
    // Initial update
    updateBookPositions();
    
    // Debounced resize handler
    const debouncedUpdate = debounce(updateBookPositions, 200);
    window.addEventListener('resize', debouncedUpdate);
    
    return () => {
      window.removeEventListener('resize', debouncedUpdate);
    };
  }, [isMobile]);

  const handleGetStarted = () => setLocation("/dashboard");
  const handleWatchDemo = () =>
    document.getElementById("scriptures")?.scrollIntoView({ behavior: "smooth" });
  const handleScriptureClick = (religion: string) =>
    setLocation(`/dashboard?religion=${religion.toLowerCase()}`);

  return (
    <>
      <Helmet>
        <title>Rellio - Explore Sacred Wisdom with AI</title>
        <meta
          name="description"
          content="Dive into Rellio, an AI-powered platform uniting scriptures from the Bible, Quran, Torah, Bhagavad Gita, and more! Engage with voice chats, scholar personas, and theme-based verse comparisons—enlighten your soul today!"
        />
        <meta property="og:title" content="Rellio - Explore Sacred Wisdom with AI" />
        <meta
          property="og:description"
          content="Dive into Rellio, an AI-powered platform uniting scriptures from the Bible, Quran, Torah, Bhagavad Gita, and more! Engage with voice chats, scholar personas, and theme-based verse comparisons—enlighten your soul today!"
        />
        <meta property="og:image" content={`${currentOrigin}/images/og-image.png`} />
        <meta
          property="og:image:alt"
          content="Rellio - Golden compass star symbol on dark navy background with 'Guiding Wisdom. Eternal Connection.' tagline"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={currentOrigin} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rellio - Explore Sacred Wisdom with AI" />
        <meta
          name="twitter:description"
          content="Dive into Rellio, an AI-powered platform uniting scriptures from the Bible, Quran, Torah, Bhagavad Gita, and more! Engage with voice chats, scholar personas, and theme-based verse comparisons—enlighten your soul today!"
        />
        <meta name="twitter:image" content={`${currentOrigin}/images/og-image.png`} />
      </Helmet>

      <div className="min-h-screen bg-black text-[#E8D18A] selection:bg-yellow-200/20 selection:text-yellow-100">
        {/* NAVIGATION */}
        <header className="fixed left-0 right-0 top-0 z-50 backdrop-blur-sm bg-black/30 border-b border-yellow-200/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={compassLogo}
                alt="Rellio compass logo"
                className="h-10 w-10 object-contain animate-pulse [animation-duration:3s]"
                loading="eager"
              />
              <span className="font-serif tracking-widest text-xl text-yellow-200">RELLIO</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm text-yellow-100/80">
              <a href="#features" className="hover:text-yellow-200 transition-colors">Features</a>
              <a href="#about" className="hover:text-yellow-200 transition-colors">About</a>
              <a href="#faq" className="hover:text-yellow-200 transition-colors">FAQ</a>
              <a href="#contact" className="hover:text-yellow-200 transition-colors">Contact</a>
              <a href="#auth" className="ml-2 rounded-full border border-yellow-200/30 px-4 py-1.5 text-yellow-100 hover:bg-yellow-200/10 transition-colors">Sign Up</a>
            </nav>
            <button className="md:hidden text-yellow-200" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* HERO SECTION */}
        <section 
          ref={heroContainerRef}
          aria-label="Rellio hero" 
          className="relative isolate h-screen overflow-hidden pt-20"
        >
          {/* Hero Image Background */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${isMobile ? mobileHeroImage : heroImage})`,
              transform: `translateY(${prefersReduced ? 0 : offset * 0.3}px)`,
              willChange: "transform",
              backgroundSize: isMobile ? "contain" : "cover",
              backgroundPosition: "center center",
            }}
          />
          
          {/* Clickable Scripture Areas positioned dynamically over the image */}
          <div className="absolute inset-0">
            {/* Torah - Dynamically positioned outline */}
            <button
              onClick={() => handleScriptureClick('judaism')}
              style={{
                top: `${bookPositions.Torah.top}px`,
                left: `${bookPositions.Torah.left}px`,
                width: `${bookPositions.Torah.width}px`,
                height: `${bookPositions.Torah.height}px`,
              }}
              className="absolute bg-transparent border-2 border-yellow-300/60 hover:border-yellow-300/90 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(255,215,0,0.8)] z-20 rounded"
              title="Explore Torah"
              aria-label="Explore Torah"
            />

            {/* Quran - Dynamically positioned outline */}
            <button
              onClick={() => handleScriptureClick('islam')}
              style={{
                top: `${bookPositions.Quran.top}px`,
                left: `${bookPositions.Quran.left}px`,
                width: `${bookPositions.Quran.width}px`,
                height: `${bookPositions.Quran.height}px`,
              }}
              className="absolute bg-transparent border-2 border-yellow-300/60 hover:border-yellow-300/90 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(255,215,0,0.8)] z-20 rounded"
              title="Explore Quran"
              aria-label="Explore Quran"
            />

            {/* Bible - Dynamically positioned outline */}
            <button
              onClick={() => handleScriptureClick('christianity')}
              style={{
                top: `${bookPositions.Bible.top}px`,
                right: `${bookPositions.Bible.right}px`,
                width: `${bookPositions.Bible.width}px`,
                height: `${bookPositions.Bible.height}px`,
              }}
              className="absolute bg-transparent border-2 border-yellow-300/60 hover:border-yellow-300/90 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(255,215,0,0.8)] z-20 rounded"
              title="Explore Bible"
              aria-label="Explore Bible"
            />

            {/* Tripitaka - Dynamically positioned outline */}
            <button
              onClick={() => handleScriptureClick('buddhism')}
              style={{
                top: `${bookPositions.Tripitaka.top}px`,
                left: `${bookPositions.Tripitaka.left}px`,
                width: `${bookPositions.Tripitaka.width}px`,
                height: `${bookPositions.Tripitaka.height}px`,
              }}
              className="absolute bg-transparent border-2 border-yellow-300/60 hover:border-yellow-300/90 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(255,215,0,0.8)] z-20 rounded"
              title="Explore Tripitaka"
              aria-label="Explore Tripitaka"
            />

            {/* Bhagavad Gita - Dynamically positioned outline */}
            <button
              onClick={() => handleScriptureClick('hinduism')}
              style={{
                top: `${bookPositions["Bhagavad Gita"].top}px`,
                right: `${bookPositions["Bhagavad Gita"].right}px`,
                width: `${bookPositions["Bhagavad Gita"].width}px`,
                height: `${bookPositions["Bhagavad Gita"].height}px`,
              }}
              className="absolute bg-transparent border-2 border-yellow-300/60 hover:border-yellow-300/90 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(255,215,0,0.8)] z-20 rounded"
              title="Explore Bhagavad Gita"
              aria-label="Explore Bhagavad Gita"
            />
          </div>
          
          {/* Mobile Navigation Helper */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center z-20 md:hidden">
            <p className="text-yellow-200/80 text-sm mb-4 font-serif tracking-wider">TAP BELOW TO EXPLORE</p>
          </div>
          
          {/* Scroll Cue */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center z-20">
            <div className="h-6 w-4 rounded-full border border-yellow-200/40 flex items-start justify-center p-1">
              <div className="h-1 w-1 rounded-full bg-yellow-200/80 animate-bounce" />
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="bg-[#0c0f12] pb-16 text-yellow-100/85">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {/* CTAs positioned above features */}
            <div className="flex flex-col items-center gap-4 mb-16">
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center justify-center rounded-lg border-2 border-yellow-300/60 bg-black/30 backdrop-blur-sm px-10 py-3 font-serif text-sm font-semibold tracking-[0.2em] text-yellow-200 transition-all duration-300 hover:border-yellow-200 hover:bg-yellow-200/10 hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                aria-label="Enter the Rellio spiritual community"
              >
                ENTER THE CIRCLE
              </button>
              <button
                onClick={handleWatchDemo}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-yellow-600/90 to-yellow-500/90 backdrop-blur-sm px-8 py-2 font-serif text-xs font-semibold tracking-[0.2em] text-black transition-all duration-300 hover:from-yellow-500 hover:to-yellow-400 hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                aria-label="Explore sacred scriptures"
              >
                EXPLORE SCRIPTURES
              </button>
            </div>
            
            <h2 className="font-serif text-2xl tracking-[0.3em] text-yellow-200 mb-16 text-center">FEATURES</h2>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Sacred Texts */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-yellow-200" />
                </div>
                <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Sacred Texts</h3>
                <p className="text-xs text-yellow-100/80 leading-relaxed">
                  Access scriptures from multiple religious traditions with authentic translations
                </p>
              </div>

              {/* AI Guidance */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-yellow-200" />
                </div>
                <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">AI Guidance</h3>
                <p className="text-xs text-yellow-100/80 leading-relaxed">
                  Scholar-grade AI personas provide contextual insights for each tradition
                </p>
              </div>

              {/* Deep Dialogue */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-yellow-200" />
                </div>
                <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Deep Dialogue</h3>
                <p className="text-xs text-yellow-100/80 leading-relaxed">
                  Engage in meaningful conversations about spiritual teachings and wisdom
                </p>
              </div>

              {/* Voice Interaction */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <Volume2 className="h-6 w-6 text-yellow-200" />
                </div>
                <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Voice Interaction</h3>
                <p className="text-xs text-yellow-100/80 leading-relaxed">
                  Listen and speak naturally with voice-enabled spiritual guidance
                </p>
              </div>

              {/* Wisdom Search */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <Search className="h-6 w-6 text-yellow-200" />
                </div>
                <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Wisdom Search</h3>
                <p className="text-xs text-yellow-100/80 leading-relaxed">
                  Find relevant passages and teachings across all sacred texts instantly
                </p>
              </div>

              {/* Progress Tracking */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-yellow-200" />
                </div>
                <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Progress Tracking</h3>
                <p className="text-xs text-yellow-100/80 leading-relaxed">
                  Monitor your spiritual journey and reading milestones
                </p>
              </div>

              {/* Multi-Perspective */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-yellow-200" />
                </div>
                <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Multi-Perspective</h3>
                <p className="text-xs text-yellow-100/80 leading-relaxed">
                  Compare interpretations and insights across different religious views
                </p>
              </div>

              {/* Community */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <Users className="h-6 w-6 text-yellow-200" />
                </div>
                <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Community</h3>
                <p className="text-xs text-yellow-100/80 leading-relaxed">
                  Connect with fellow seekers on their spiritual journeys
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION */}
        <section id="about" className="bg-[#0c0f12] py-24 text-yellow-100/85">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <h2 className="font-serif text-2xl tracking-[0.3em] text-yellow-200 mb-12">ABOUT US</h2>
            <p className="text-lg leading-relaxed text-yellow-100/80">
              Rellio bridges spiritual traditions through AI-powered dialogue, creating a sanctuary where ancient wisdom meets modern technology. 
              Our platform unites the world's sacred texts - Bible, Qur'an, Torah, Bhagavad Gita, and Tripitaka - in one accessible experience. 
              Through specialized scholar personas and voice-first interactions, we facilitate deep exploration of faith across boundaries, 
              fostering understanding and connection in our shared human journey toward wisdom and meaning.
            </p>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="bg-[#0c0f12] py-24 text-yellow-100/85">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="font-serif text-2xl tracking-[0.3em] text-yellow-200 mb-12 text-center">FAQ</h2>
            <div className="space-y-4">
              {[
                {
                  question: "HOW DOES RELLIO WORK?",
                  answer: "Rellio uses AI to provide contextual insights from sacred texts through specialized religious scholar personas. Simply select a scripture, ask questions, and receive thoughtful responses grounded in theological traditions."
                },
                {
                  question: "WHICH SCRIPTURES ARE AVAILABLE?",
                  answer: "We support five major religious traditions: Christianity (Bible), Islam (Qur'an), Judaism (Torah), Hinduism (Bhagavad Gita), and Buddhism (Tripitaka), with plans to expand our library."
                },
                {
                  question: "ARE THE AI RESPONSES THEOLOGICALLY ACCURATE?",
                  answer: "Our AI is trained on scholarly sources and responds through specialized religious personas to ensure respectful, informed guidance that honors each tradition's authentic teachings."
                },
                {
                  question: "IS RELLIO FREE TO USE?",
                  answer: "Rellio offers both free and premium tiers. Free users can explore scriptures and have basic conversations, while premium members get unlimited AI interactions and advanced features."
                }
              ].map((faq, index) => (
                <div key={index} className="border-b border-yellow-200/20 pb-4">
                  <button className="w-full flex justify-between items-center text-left py-4 group">
                    <h3 className="font-serif text-yellow-200 font-semibold tracking-wide group-hover:text-yellow-100 transition-colors">
                      {faq.question}
                    </h3>
                    <svg className="w-5 h-5 text-yellow-200 group-hover:text-yellow-100 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="text-sm text-yellow-100/70 leading-relaxed pl-0">
                    {faq.answer}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="bg-black py-24 text-yellow-100/85">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="font-serif text-2xl tracking-[0.3em] text-yellow-200 mb-4">CONNECT WITH US</h2>
              <p className="font-serif text-lg tracking-[0.2em] text-yellow-200/80">GET IN TOUCH</p>
              <p className="font-serif text-sm tracking-[0.3em] text-yellow-300/60 mt-2">SACRED CONNECTIONS</p>
            </div>
            
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Contact Information */}
              <div className="space-y-8">
                <div className="text-center lg:text-left">
                  <h3 className="font-serif text-xl tracking-[0.2em] text-yellow-200 mb-8">Follow Our Journey</h3>
                  
                  <div className="space-y-6">
                    {/* Email */}
                    <div className="flex items-center justify-center lg:justify-start gap-4">
                      <div className="w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-yellow-200" />
                      </div>
                      <div>
                        <p className="font-serif text-yellow-200 tracking-wide">hello@rellio.app</p>
                      </div>
                    </div>
                    
                    {/* Phone */}
                    <div className="flex items-center justify-center lg:justify-start gap-4">
                      <div className="w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                        <Phone className="h-6 w-6 text-yellow-200" />
                      </div>
                      <div>
                        <p className="font-serif text-yellow-200 tracking-wide">+1 (555) RELLIO-1</p>
                      </div>
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-center justify-center lg:justify-start gap-4">
                      <div className="w-12 h-12 rounded-full border border-yellow-300/50 flex items-center justify-center">
                        <Globe className="h-6 w-6 text-yellow-200" />
                      </div>
                      <div>
                        <p className="font-serif text-yellow-200 tracking-wide">Digital Platform - Serving Globally</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Contact Form */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-8">
                <h3 className="font-serif text-xl tracking-[0.2em] text-yellow-200 mb-2 text-center">Send us a Message</h3>
                <p className="text-sm text-yellow-100/70 mb-8 text-center">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
                
                <form className="space-y-6">
                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-serif text-yellow-200 mb-2 tracking-wide">Your Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-lg bg-black/50 border border-yellow-300/30 text-yellow-100 placeholder-yellow-100/40 focus:border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-200/20 transition-all duration-300"
                      placeholder="Enter your name"
                    />
                  </div>
                  
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-serif text-yellow-200 mb-2 tracking-wide">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full px-4 py-3 rounded-lg bg-black/50 border border-yellow-300/30 text-yellow-100 placeholder-yellow-100/40 focus:border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-200/20 transition-all duration-300"
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  {/* Message Field */}
                  <div>
                    <label className="block text-sm font-serif text-yellow-200 mb-2 tracking-wide">Your Message</label>
                    <textarea 
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg bg-black/50 border border-yellow-300/30 text-yellow-100 placeholder-yellow-100/40 focus:border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-200/20 transition-all duration-300 resize-none"
                      placeholder="Share your thoughts, questions, or feedback..."
                    />
                  </div>
                  
                  {/* Submit Button */}
                  <button 
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-600/90 to-yellow-500/90 backdrop-blur-sm px-8 py-3 font-serif text-sm font-semibold tracking-[0.2em] text-black transition-all duration-300 hover:from-yellow-500 hover:to-yellow-400 hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                  >
                    <Send className="h-4 w-4" />
                    SEND SACRED MESSAGE
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-black py-8 text-yellow-100/50 border-t border-yellow-200/10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            {/* Logo and Navigation */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img src={compassLogo} alt="Rellio compass logo" className="h-10 w-10 object-contain" loading="lazy" />
              </div>
              <h2 className="font-serif text-xl tracking-[0.3em] text-yellow-200 mb-4">RELLIO</h2>
              
              {/* Footer Navigation */}
              <div className="flex flex-wrap justify-center gap-6 text-xs">
                <a href="#features" className="hover:text-yellow-200 transition-colors">Features</a>
                <a href="#about" className="hover:text-yellow-200 transition-colors">About</a>
                <a href="#faq" className="hover:text-yellow-200 transition-colors">FAQ</a>
                <a href="#contact" className="hover:text-yellow-200 transition-colors">Contact</a>
                <a href="/privacy" className="hover:text-yellow-200 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-yellow-200 transition-colors">Terms</a>
              </div>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex justify-center gap-4 mb-4">
              {/* X (Twitter) */}
              <a href="https://x.com/RellioApp" className="w-8 h-8 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on X">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              
              {/* LinkedIn */}
              <a href="https://www.linkedin.com/company/rellioapp/" className="w-8 h-8 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on LinkedIn">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              
              {/* TikTok */}
              <a href="https://www.tiktok.com/@rellioapp?is_from_webapp=1&sender_device=pc" className="w-8 h-8 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on TikTok">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
                </svg>
              </a>
              
              {/* Instagram */}
              <a href="https://www.instagram.com/rellioapp?igsh=MXRremNtOGZka3pq&utm_source=qr" className="w-8 h-8 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on Instagram">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348zm7.718 0c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348z" clipRule="evenodd" />
                </svg>
              </a>
              
              {/* YouTube */}
              <a href="https://www.youtube.com/@RellioApp" className="w-8 h-8 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on YouTube">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
            
            {/* Copyright */}
            <div className="text-center text-xs border-t border-yellow-200/10 pt-4">
              © {new Date().getFullYear()} Rellio. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}