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



/**
 * RellioLanding.tsx
 * Production-ready landing hero with clickable books and refined text placement.
 */
export default function LandingPage({
  bgUrl = "/assets/rellio-hero.jpg", // Cosmic artwork with scriptures
  logoUrl = "/assets/rellio-logo-gold.png",
}: {
  bgUrl?: string;
  logoUrl?: string;
} = {}) {
  const [offset, setOffset] = useState(0);
  const [, setLocation] = useLocation();
  
  // Get current URL for Open Graph tags
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Parallax effect with reduced motion support
  const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  useEffect(() => {
    if (prefersReduced) return;
    const onScroll = () => {
      const y = window.scrollY;
      setOffset(Math.min(y * 0.2, 80));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [prefersReduced]);

  const handleGetStarted = () => {
    setLocation('/dashboard');
  };

  const handleWatchDemo = () => {
    // Scroll to scriptures section for demo
    document.getElementById('scriptures')?.scrollIntoView({ behavior: 'smooth' });
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
      {/* NAV */}
      <header className="fixed left-0 right-0 top-0 z-50 backdrop-blur-sm bg-black/30 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img src={logoUrl} alt="Rellio compass logo" className="h-8 w-8 object-contain animate-pulse" loading="eager" />
            )}
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

      {/* HERO */}
      <section aria-label="Rellio hero" className="relative isolate flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background image */}
        <div
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage: `url(${bgUrl})`,
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
            {logoUrl && (
              <img src={logoUrl} alt="Rellio compass logo" className="h-8 w-8 object-contain animate-pulse" loading="eager" />
            )}
            <span className="font-serif tracking-widest text-xl text-yellow-200">RELLIO</span>
          </div>
          <p className="mx-auto max-w-3xl text-base md:text-lg text-yellow-100/80">
            One Scripture Across Worlds<br />Guiding Wisdom. Eternal Connection.<br />Discover insights across traditions. Ask, compare, and learn with scholar-grade AI.
          </p>

          {/* Hero Image with Clickable Scripture Areas */}
          <div className="relative mx-auto mb-12 w-full max-w-4xl">
            {/* Main Hero Image */}
            <div className="relative w-full h-[400px] md:h-[500px] bg-cover bg-center rounded-lg overflow-hidden" 
                 style={{ backgroundImage: `url(${bgUrl})` }}>
              
              {/* Clickable Scripture Areas - Positioned over the image */}
              {/* Torah - Top Left */}
              <button
                onClick={() => handleScriptureClick('judaism')}
                className="absolute top-[15%] left-[15%] w-16 h-20 md:w-20 md:h-24 hover:scale-110 transition-transform duration-300 z-10"
                title="Explore Torah"
                aria-label="Explore Torah"
              >
                <div className="w-full h-full bg-yellow-500/20 hover:bg-yellow-500/40 rounded border border-yellow-300/50 hover:border-yellow-200 transition-all duration-300" />
              </button>

              {/* Quran - Top Center */}
              <button
                onClick={() => handleScriptureClick('islam')}
                className="absolute top-[10%] left-1/2 -translate-x-1/2 w-16 h-20 md:w-20 md:h-24 hover:scale-110 transition-transform duration-300 z-10"
                title="Explore Quran"
                aria-label="Explore Quran"
              >
                <div className="w-full h-full bg-teal-500/20 hover:bg-teal-500/40 rounded border border-teal-300/50 hover:border-teal-200 transition-all duration-300" />
              </button>

              {/* Bible - Top Right */}
              <button
                onClick={() => handleScriptureClick('christianity')}
                className="absolute top-[15%] right-[15%] w-16 h-20 md:w-20 md:h-24 hover:scale-110 transition-transform duration-300 z-10"
                title="Explore Bible"
                aria-label="Explore Bible"
              >
                <div className="w-full h-full bg-blue-500/20 hover:bg-blue-500/40 rounded border border-blue-300/50 hover:border-blue-200 transition-all duration-300" />
              </button>

              {/* Tripitaka - Bottom Left */}
              <button
                onClick={() => handleScriptureClick('buddhism')}
                className="absolute bottom-[20%] left-[15%] w-16 h-20 md:w-20 md:h-24 hover:scale-110 transition-transform duration-300 z-10"
                title="Explore Tripitaka"
                aria-label="Explore Tripitaka"
              >
                <div className="w-full h-full bg-purple-500/20 hover:bg-purple-500/40 rounded border border-purple-300/50 hover:border-purple-200 transition-all duration-300" />
              </button>

              {/* Bhagavad Gita - Bottom Right */}
              <button
                onClick={() => handleScriptureClick('hinduism')}
                className="absolute bottom-[20%] right-[15%] w-16 h-20 md:w-20 md:h-24 hover:scale-110 transition-transform duration-300 z-10"
                title="Explore Bhagavad Gita"
                aria-label="Explore Bhagavad Gita"
              >
                <div className="w-full h-full bg-orange-500/20 hover:bg-orange-500/40 rounded border border-orange-300/50 hover:border-orange-200 transition-all duration-300" />
              </button>
            </div>
          </div>

          {/* CTAs */}
          <div className="mx-auto mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={handleGetStarted}
              className="group inline-flex items-center justify-center rounded-full border border-yellow-300/60 bg-gradient-to-br from-yellow-200 to-yellow-300 px-8 py-4 font-medium text-black backdrop-blur-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/60 font-serif tracking-widest"
              aria-label="Enter the Rellio spiritual community"
            >
              ENTER THE CIRCLE
            </button>
            <button
              onClick={handleWatchDemo}
              className="inline-flex items-center justify-center rounded-full border border-yellow-300/60 px-8 py-4 font-medium text-yellow-100 transition hover:border-yellow-300/80 hover:text-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/60 font-serif tracking-widest"
              aria-label="Explore sacred scriptures"
            >
              EXPLORE SCRIPTURES
            </button>
          </div>

          {/* Tagline */}
          <div className="mt-12 text-center">
            <h2 className="font-serif text-xl md:text-2xl tracking-[0.3em] text-yellow-200">
              ONE SCRIPTURE ACROSS WORLDS
            </h2>
          </div>
          
          {/* Scroll cue */}
          <div className="mt-16 flex justify-center">
            <div className="h-10 w-6 rounded-full border border-yellow-200/30 flex items-start justify-center p-1">
              <div className="h-2 w-1 rounded-full bg-yellow-200/70 animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* SCRIPTURES SECTION */}
      <section id="scriptures" className="bg-gradient-to-r from-black to-indigo-900 py-24 text-yellow-100/90">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl tracking-widest text-yellow-200 mb-12">SACRED SCRIPTURES</h2>
          
          {/* Five Sacred Scriptures Grid */}
          <div className="grid gap-8 md:grid-cols-5 justify-center items-center">
            {[
              { name: 'Qur’an', religion: 'islam', colorClass: 'border-teal-300/60 hover:border-teal-200 hover:shadow-[0_0_30px_rgba(0,213,255,0.4)]', symbol: '☪' },
              { name: 'Bible', religion: 'christianity', colorClass: 'border-blue-300/60 hover:border-blue-200 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]', symbol: '✝' },
              { name: 'Torah', religion: 'judaism', colorClass: 'border-yellow-300/60 hover:border-yellow-200 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]', symbol: '✡' },
              { name: 'Bhagavad Gita', religion: 'hinduism', colorClass: 'border-orange-300/60 hover:border-orange-200 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]', symbol: 'ॐ' },
              { name: 'Tripitaka', religion: 'buddhism', colorClass: 'border-purple-300/60 hover:border-purple-200 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)]', symbol: '☸' }
            ].map((book) => (
              <div key={book.name} className="group cursor-pointer" onClick={() => handleScriptureClick(book.religion)}>
                <div className={`relative w-24 h-32 mx-auto rounded-lg border-2 ${book.colorClass} bg-gradient-to-br from-black/80 to-black/40 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:brightness-120`}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <div className="text-2xl mb-2 text-yellow-200">{book.symbol}</div>
                    <div className="text-xs font-serif text-yellow-100/80 text-center leading-tight group-hover:text-yellow-200 transition-colors">{book.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <p className="mt-8 text-sm text-yellow-100/70 max-w-2xl mx-auto">
            Click any scripture to begin your spiritual journey with AI-guided exploration and cross-traditional wisdom.
          </p>
        </div>
      </section>

      {/* DUMMY SECTIONS (replace with real content) */}
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
      
      {/* About Us Section */}
      <section id="about" className="bg-black py-24 text-yellow-100/85">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-serif text-2xl tracking-[0.3em] text-yellow-200 mb-16 text-center">ABOUT US</h2>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Unified Wisdom */}
            <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full border border-yellow-300/50 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-yellow-200" />
              </div>
              <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Unified Wisdom</h3>
              <p className="text-sm text-yellow-100/80 leading-relaxed">
                Discover insights from multiple sacred texts through one source experience.
              </p>
            </div>

            {/* Daily Inspiration */}
            <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full border border-yellow-300/50 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-yellow-200" />
              </div>
              <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Daily Inspiration</h3>
              <p className="text-sm text-yellow-100/80 leading-relaxed">
                Receive daily verses and thoughtful texts. Comes authentic divine messages.
              </p>
            </div>

            {/* Search & Compare */}
            <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full border border-yellow-300/50 flex items-center justify-center">
                <Search className="h-8 w-8 text-yellow-200" />
              </div>
              <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Search & Compare</h3>
              <p className="text-sm text-yellow-100/80 leading-relaxed">
                Easily find and compare passages across different scriptures.
              </p>
            </div>

            {/* Community Forum */}
            <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-6 text-center hover:border-yellow-200/50 transition-all duration-300">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full border border-yellow-300/50 flex items-center justify-center">
                <Users className="h-8 w-8 text-yellow-200" />
              </div>
              <h3 className="mb-3 font-serif text-yellow-200 font-semibold text-lg tracking-wide">Community Forum</h3>
              <p className="text-sm text-yellow-100/80 leading-relaxed">
                Connect with like minded in our rich discussions on our spiritual community platform.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Community Section */}
      <section id="community" className="bg-gradient-to-r from-[#0c0f12] to-indigo-900 py-24 text-yellow-100/85">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl tracking-widest text-yellow-200 mb-8">COMMUNITY</h2>
          <p className="text-lg mb-8">Join readers, scholars, and seekers. Share insights with care and depth.</p>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-2 font-serif text-yellow-200 font-semibold">Global Discussions</h3>
              <p className="text-sm text-yellow-100/80">Connect with seekers worldwide in thoughtful theological conversations.</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-2 font-serif text-yellow-200 font-semibold">Scholar Network</h3>
              <p className="text-sm text-yellow-100/80">Learn from certified religious scholars and academic experts.</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-2 font-serif text-yellow-200 font-semibold">Study Groups</h3>
              <p className="text-sm text-yellow-100/80">Join focused groups for deep scripture study and reflection.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQ SECTION */}
      <section id="faq" className="bg-black py-24 text-yellow-100/85">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-serif text-2xl tracking-[0.3em] text-yellow-200 mb-12 text-center">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="space-y-4">
            {[
              {
                question: "WHAT SCRIPTURES DO YOU FEATURE?",
                answer: "Set pharetra laoreet id by Struiensrrete. Quran internalis, olives, pescaricuc includes our elassie Aoclemcs, and equittee to eut this srriptune hegnoensous."
              },
              {
                question: "HOW DOES RELLIO FOSTER COMMUNITY?",
                answer: "Quirsn and the UF, ehrat-communities seawe recently dircomvered from-olevera repatiosis via important opiltation, forcers thurudieals, and more."
              },
              {
                question: "IS MY DATA SECURE AND PRIVATE?",
                answer: "We kness sure policy-muttcc solve in deeums of mivitional access aduiaeer to wir, daily e pubtte powem, and meeh meeh more drautic and aqueutto aeoA."
              },
              {
                question: "HOW CAN I GET FURTHER SUPPORT?",
                answer: "We're here to help stuehmit la stuff with towigtamue-at eliseue for heart-eles eustomm. h logkely ero."
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

      {/* AUTH ANCHOR */}
      <section id="auth" className="bg-black py-24 text-yellow-100/85">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h3 className="mb-4 text-center font-serif text-xl tracking-widest text-yellow-200">ENTER THE CIRCLE</h3>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleGetStarted(); }}>
              <label className="block">
                <span className="mb-1 block text-sm">Email</span>
                <input type="email" required className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-yellow-50 placeholder-yellow-100/40 outline-none focus:border-yellow-300/60" placeholder="you@rellio.app" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm">Password</span>
                <input type="password" required className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-yellow-50 placeholder-yellow-100/40 outline-none focus:border-yellow-300/60" placeholder="••••••••" />
              </label>
              <button type="submit" className="mt-2 w-full rounded-full border border-yellow-300/60 bg-yellow-200/10 px-5 py-3 font-medium text-yellow-100 hover:bg-yellow-200/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/60">
                Continue
              </button>
            </form>
          </div>
        </div>
      </section>
      <footer className="bg-black py-16 text-yellow-100/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Privacy Notice and Terms of Service */}
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <h3 className="font-serif text-xl tracking-[0.3em] text-yellow-200 mb-6">PRIVACY NOTICE</h3>
              <p className="text-sm text-yellow-100/70 leading-relaxed">
                Lorem ipsum dolor consectetur adipiscing elit elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl tracking-[0.3em] text-yellow-200 mb-6">TERMS OF SERVICE</h3>
              <p className="text-sm text-yellow-100/70 leading-relaxed">
                Lorem ipsum ut simply dummy text of sed do of the printing and typesetting industry at durante dunt labore.
              </p>
            </div>
          </div>
          
          {/* Logo and Navigation */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              {logoUrl && (
                <img src={logoUrl} alt="Rellio compass logo" className="h-12 w-12 object-contain" loading="lazy" />
              )}
            </div>
            <h2 className="font-serif text-3xl tracking-[0.3em] text-yellow-200 mb-8">RELLIO</h2>
            
            {/* Footer Navigation */}
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              <a href="#features" className="hover:text-yellow-200 transition-colors">Features</a>
              <a href="#about" className="hover:text-yellow-200 transition-colors">About</a>
              <a href="#community" className="hover:text-yellow-200 transition-colors">Community</a>
              <a href="#faq" className="hover:text-yellow-200 transition-colors">FAQ</a>
              <a href="/privacy" className="hover:text-yellow-200 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-yellow-200 transition-colors">Terms</a>
            </div>
          </div>
          
          {/* Social Media Icons */}
          <div className="flex justify-center gap-6 mb-8">
            <a href="https://facebook.com/rellio" className="w-10 h-10 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 transition-all duration-300" aria-label="Follow us on Facebook">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="https://x.com/rellio" className="w-10 h-10 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 transition-all duration-300" aria-label="Follow us on X">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://instagram.com/rellio" className="w-10 h-10 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 transition-all duration-300" aria-label="Follow us on Instagram">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348zm7.718 0c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="https://linkedin.com/company/rellio" className="w-10 h-10 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 transition-all duration-300" aria-label="Follow us on LinkedIn">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          
          {/* Copyright */}
          <div className="text-center text-xs border-t border-white/5 pt-8">
            © {new Date().getFullYear()} Rellio. All rights reserved.
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}