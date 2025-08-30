import { useState, useEffect } from "react";
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
  Sparkles
} from "lucide-react";
import rellioLogo from "@assets/Rellio logo_1756158287035.png";
import cosmicHeroImage from "@assets/generated_images/Cosmic_spiritual_hero_background_5470e8d2.png";



export default function LandingPage() {
  const [offset, setOffset] = useState(0);
  const [, setLocation] = useLocation();
  
  // Get current URL for Open Graph tags
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Parallax effect with reduced motion support
  const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  useEffect(() => {
    if (prefersReduced) return; // Respect user settings
    const onScroll = () => {
      const y = window.scrollY;
      // Clamp parallax so it stays subtle
      setOffset(Math.min(y * 0.2, 80));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [prefersReduced]);

  const handleGetStarted = () => {
    setLocation('/dashboard');
  };

  const handleWatchDemo = () => {
    // Scroll to features section for demo
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScriptureClick = (religion: string) => {
    // Navigate to dashboard with specific religion selected
    setLocation(`/dashboard?religion=${religion.toLowerCase()}`);
  };

  return (
    <>
      <Helmet>
        <title>Rellio - Explore Sacred Wisdom with AI</title>
        <meta name="description" content="Dive into Rellio, an AI-powered platform uniting scriptures from the Bible, Quran, Torah, Bhagavad Gita, and more! Engage with voice chats, scholar personas, and theme-based verse comparisons—enlighten your soul today!" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="Rellio - Explore Sacred Wisdom with AI" />
        <meta property="og:description" content="Dive into Rellio, an AI-powered platform uniting scriptures from the Bible, Quran, Torah, Bhagavad Gita, and more! Engage with voice chats, scholar personas, and theme-based verse comparisons—enlighten your soul today!" />
        <meta property="og:image" content={`${currentOrigin}/images/og-image.png`} />
        <meta property="og:image:alt" content="Rellio - Golden compass star symbol on dark navy background with 'Guiding Wisdom. Eternal Connection.' tagline" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={currentOrigin} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rellio - Explore Sacred Wisdom with AI" />
        <meta name="twitter:description" content="Dive into Rellio, an AI-powered platform uniting scriptures from the Bible, Quran, Torah, Bhagavad Gita, and more! Engage with voice chats, scholar personas, and theme-based verse comparisons—enlighten your soul today!" />
        <meta name="twitter:image" content={`${currentOrigin}/images/og-image.png`} />
      </Helmet>
      
      <div className="min-h-screen bg-black text-[#E8D18A] selection:bg-yellow-200/20 selection:text-yellow-100">
      {/* Navigation */}
      <header className="fixed left-0 right-0 top-0 z-50 backdrop-blur-sm bg-black/30 border-b border-yellow-200/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={rellioLogo} alt="Rellio compass logo" className="h-8 w-8 object-contain" loading="eager" />
            <span className="font-serif tracking-widest text-xl text-yellow-200">RELLIO</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-yellow-100/80">
            <a href="#features" className="hover:text-yellow-200 transition-colors">Features</a>
            <a href="#about" className="hover:text-yellow-200 transition-colors">About</a>
            <a href="#community" className="hover:text-yellow-200 transition-colors">Community</a>
            <a href="#auth" className="ml-2 rounded-full border border-yellow-200/30 px-4 py-1.5 text-yellow-100 hover:bg-yellow-200/10 transition-colors">Sign Up</a>
          </nav>
          <button className="md:hidden text-yellow-200" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section aria-label="Rellio hero" className="relative isolate flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background image */}
        <div
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage: `url(${cosmicHeroImage})`,
            transform: `translateY(${prefersReduced ? 0 : offset * 0.6}px)`,
            willChange: "transform",
          }}
        />
        {/* Gradient + vignette overlays for legibility */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/20 to-black/50" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_60%,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_40%,rgba(0,0,0,0.55)_100%)]" />
        
        {/* Center content */}
        <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 pt-28 pb-24 text-center">
          {/* Logo lockup */}
          <div className="mx-auto mb-6 flex items-center justify-center gap-4">
            <img src={rellioLogo} alt="Rellio compass" className="h-10 w-10 md:h-12 md:w-12 animate-pulse [animation-duration:3s]" />
            <h1 className="font-serif text-4xl md:text-6xl tracking-[0.25em] text-yellow-200 drop-shadow-[0_1px_0_rgba(0,0,0,0.8)]">RELLIO</h1>
          </div>
          
          {/* Taglines */}
          <div className="mx-auto max-w-3xl space-y-2 mb-6">
            <p className="text-xl md:text-2xl font-serif text-yellow-200 leading-tight">
              One Scripture Across Worlds
            </p>
            <p className="text-base md:text-lg text-yellow-200/80 font-light">
              Guiding Wisdom. Eternal Connection.
            </p>
            <p className="text-sm md:text-base text-yellow-100/80 font-light mt-4">
              Discover insights across traditions. Ask, compare, and learn with scholar-grade AI.
            </p>
          </div>

          {/* Five Sacred Scriptures Circle */}
          <div className="relative mx-auto mb-12 w-80 h-80 md:w-96 md:h-96">
            {/* Center Unity Orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 animate-pulse [animation-duration:3s] shadow-[0_0_40px_rgba(255,215,0,0.6)]" />
            
            {/* Seeker Silhouette */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 bg-black/80 rounded-full" style={{clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)'}} />
            
            {/* Scripture Books */}
            {[
              { name: 'QURAN', religion: 'islam', position: 'top-0 left-1/2 -translate-x-1/2', colorClass: 'border-teal-300/60 bg-gradient-to-br from-teal-900/20 to-black/80 group-hover:border-teal-200 group-hover:shadow-glow-teal', symbol: '☪' },
              { name: 'TORAH', religion: 'judaism', position: 'top-1/4 right-0', colorClass: 'border-yellow-300/60 bg-gradient-to-br from-yellow-900/20 to-black/80 group-hover:border-yellow-200 group-hover:shadow-glow-gold', symbol: '✡' },
              { name: 'BIBLE', religion: 'christianity', position: 'bottom-1/4 right-0', colorClass: 'border-blue-300/60 bg-gradient-to-br from-blue-900/20 to-black/80 group-hover:border-blue-200 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]', symbol: '✝' },
              { name: 'BHAGAVAD\nGITA', religion: 'hinduism', position: 'bottom-0 left-1/2 -translate-x-1/2', colorClass: 'border-orange-300/60 bg-gradient-to-br from-orange-900/20 to-black/80 group-hover:border-orange-200 group-hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]', symbol: 'ॐ' },
              { name: 'TRIPITAKA', religion: 'buddhism', position: 'top-1/4 left-0', colorClass: 'border-purple-300/60 bg-gradient-to-br from-purple-900/20 to-black/80 group-hover:border-purple-200 group-hover:shadow-[0_0_30px_rgba(147,51,234,0.4)]', symbol: '☸' }
            ].map((book, index) => (
              <button
                key={book.name}
                onClick={() => handleScriptureClick(book.religion)}
                className={`absolute ${book.position} group cursor-pointer transition-all duration-300 hover:scale-110`}
                title={`Explore ${book.name}`}
              >
                <div className={`relative w-20 h-28 md:w-24 md:h-32 rounded-lg border-2 ${book.colorClass} backdrop-blur-sm transition-all duration-300`}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <div className="text-xl mb-1">{book.symbol}</div>
                    <div className="text-xs font-serif text-yellow-200 text-center leading-tight whitespace-pre-line">{book.name}</div>
                  </div>
                  {/* Connecting line to center */}
                  <div className="absolute top-1/2 left-1/2 w-20 h-0.5 bg-gradient-to-r from-yellow-300/40 to-yellow-300/80 origin-center transform -translate-x-1/2 -translate-y-1/2" 
                       style={{
                         transform: `translate(-50%, -50%) rotate(${72 * index}deg)`
                       }} />
                </div>
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="mx-auto mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={handleGetStarted}
              className="group inline-flex items-center justify-center rounded-full border border-yellow-300/60 bg-gradient-to-br from-yellow-200 to-yellow-300 px-6 py-3 font-medium text-black backdrop-blur-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/60"
              aria-label="Enter the Rellio spiritual community"
            >
              Enter the Circle
              <svg className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M12.293 4.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 11-1.414-1.414L14.586 10H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"/>
              </svg>
            </button>
            <button
              onClick={handleWatchDemo}
              className="inline-flex items-center justify-center rounded-full border border-yellow-300/30 px-6 py-3 font-medium text-yellow-100/90 transition hover:border-yellow-300/60 hover:text-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/60"
              aria-label="Explore sacred scriptures"
            >
              Explore Scriptures
            </button>
          </div>
          
          {/* Scroll cue */}
          <div className="mt-14 flex justify-center">
            <div className="h-10 w-6 rounded-full border border-yellow-200/30 flex items-start justify-center p-1">
              <div className="h-2 w-1 rounded-full bg-yellow-200/70 animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gradient-to-r from-[#0c0f12] to-indigo-900 py-24 text-yellow-100/90">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-serif text-2xl tracking-widest text-yellow-200 mb-8">FEATURES</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "AI Sage Scholar",
                body: "Converse with multi-faith scholar personas grounded in scripture.",
              },
              {
                title: "Parallel Scriptures", 
                body: "Compare verses across traditions with context and commentary.",
              },
              {
                title: "Voice & Real-time",
                body: "Speak, interrupt, and refine queries hands-free as you read.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/5 bg-white/5 p-6">
                <h3 className="mb-2 font-serif text-yellow-200 font-semibold">{c.title}</h3>
                <p className="text-sm text-yellow-100/80">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* About Section */}
      <section id="about" className="bg-black py-24 text-yellow-100/85">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl tracking-widest text-yellow-200 mb-4">ONE SCRIPTURE ACROSS WORLDS</h2>
          <p className="text-balance text-base">
            Rellio unites wisdom traditions through dialogue. Explore, compare, and connect with living texts in a sanctuary of calm design and world-class craft.
          </p>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="bg-gradient-to-r from-[#0c0f12] to-indigo-900 py-24 text-yellow-100/85">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl tracking-widest text-yellow-200 mb-8">COMMUNITY</h2>
          <p>Join readers, scholars, and seekers. Share insights with care and depth.</p>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth" className="bg-black py-24 text-yellow-100/85">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h3 className="mb-4 text-center font-serif text-xl tracking-widest text-yellow-200">ENTER THE CIRCLE</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm">Email</span>
                <input type="email" required className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-yellow-50 placeholder-yellow-100/40 outline-none focus:border-yellow-300/60" placeholder="you@rellio.app" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm">Password</span>
                <input type="password" required className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-yellow-50 placeholder-yellow-100/40 outline-none focus:border-yellow-300/60" placeholder="••••••••" />
              </label>
              <button 
                onClick={handleGetStarted}
                className="mt-2 w-full rounded-full border border-yellow-300/60 bg-yellow-200/10 px-5 py-3 font-medium text-yellow-100 hover:bg-yellow-200/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/60 transition-all duration-300"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-white/5 bg-black py-10 text-center text-xs text-yellow-100/50">
        © {new Date().getFullYear()} Rellio. All rights reserved.
      </footer>
      </div>
    </>
  );
}