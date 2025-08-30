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

          {/* Five Sacred Scriptures Circle */}
          <div className="relative mx-auto mb-12 w-96 h-96 md:w-[500px] md:h-[500px]">
            {/* Central Unity Orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 animate-pulse [animation-duration:3s] shadow-[0_0_60px_rgba(255,215,0,0.8)] z-20" />
            
            {/* Seeker Silhouette */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-16 bg-black rounded-full z-30" style={{clipPath: 'ellipse(40% 100% at 50% 100%)'}} />
            
            {/* Scripture Books in Circle */}
            {[
              { name: 'TORAH', religion: 'judaism', position: { top: '10%', left: '20%' }, colorClass: 'border-yellow-300/80 bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 group-hover:border-yellow-200 group-hover:shadow-[0_0_40px_rgba(255,215,0,0.6)]', symbol: '✡' },
              { name: 'QURAN', religion: 'islam', position: { top: '5%', left: '50%', transform: 'translateX(-50%)' }, colorClass: 'border-teal-300/80 bg-gradient-to-br from-teal-900/40 to-teal-800/20 group-hover:border-teal-200 group-hover:shadow-[0_0_40px_rgba(0,213,255,0.6)]', symbol: '☪' },
              { name: 'BIBLE', religion: 'christianity', position: { top: '10%', right: '20%' }, colorClass: 'border-blue-300/80 bg-gradient-to-br from-blue-900/40 to-blue-800/20 group-hover:border-blue-200 group-hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]', symbol: '✝' },
              { name: 'TRIPITAKA', religion: 'buddhism', position: { bottom: '15%', left: '15%' }, colorClass: 'border-purple-300/80 bg-gradient-to-br from-purple-900/40 to-purple-800/20 group-hover:border-purple-200 group-hover:shadow-[0_0_40px_rgba(147,51,234,0.6)]', symbol: '☸' },
              { name: 'BHAGAVAD\\nGITA', religion: 'hinduism', position: { bottom: '15%', right: '15%' }, colorClass: 'border-orange-300/80 bg-gradient-to-br from-orange-900/40 to-orange-800/20 group-hover:border-orange-200 group-hover:shadow-[0_0_40px_rgba(249,115,22,0.6)]', symbol: 'ॐ' }
            ].map((book, index) => (
              <div key={book.name} className="absolute group">
                <div className="absolute" style={book.position}>
                  {/* Connecting Line to Center */}
                  <div 
                    className="absolute w-[1px] h-20 md:h-32 bg-gradient-to-b from-yellow-300/60 to-transparent origin-bottom z-10"
                    style={{
                      left: '50%',
                      bottom: '100%',
                      transform: `translateX(-50%) rotate(${
                        book.name === 'TORAH' ? '45deg' :
                        book.name === 'QURAN' ? '90deg' :
                        book.name === 'BIBLE' ? '135deg' :
                        book.name === 'TRIPITAKA' ? '-45deg' : '-135deg'
                      })`,
                      transformOrigin: 'bottom center'
                    }}
                  />
                  
                  {/* Scripture Book */}
                  <button
                    onClick={() => handleScriptureClick(book.religion)}
                    className={`relative w-20 h-28 md:w-24 md:h-32 rounded-lg border-2 ${book.colorClass} backdrop-blur-sm transition-all duration-500 hover:scale-110 hover:brightness-120 z-20`}
                    title={`Explore ${book.name.replace('\\n', ' ')}`}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                      <div className="text-xl md:text-2xl mb-1 text-yellow-200">{book.symbol}</div>
                      <div className="text-xs font-serif text-yellow-200 text-center leading-tight whitespace-pre-line font-bold tracking-wider">{book.name}</div>
                    </div>
                  </button>
                </div>
              </div>
            ))}
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
          <h2 className="font-serif text-2xl tracking-widest text-yellow-200 mb-12 text-center">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="space-y-6">
            {[
              {
                question: "How does Rellio work?",
                answer: "Rellio provides AI-powered insights from sacred texts across five major religious traditions. Simply select a scripture, ask questions, and receive contextual responses from specialized religious scholar personas."
              },
              {
                question: "Is Rellio free to use?",
                answer: "Rellio offers both free and premium tiers. Free users can explore scriptures and have basic conversations, while premium members get unlimited AI interactions and advanced features."
              },
              {
                question: "Which religious texts are available?",
                answer: "We currently support the Qur'an, Bible, Torah, Bhagavad Gita, and Tripitaka (Buddhist texts), with plans to expand to more traditions."
              },
              {
                question: "Are the AI responses theologically accurate?",
                answer: "Our AI is trained on scholarly sources and responds through specialized religious personas (Islamic Mufti, Christian Priest, Jewish Rabbi, Hindu Guru, Buddhist Monk) to ensure respectful and informed guidance."
              }
            ].map((faq, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="mb-3 font-serif text-yellow-200 font-semibold">{faq.question}</h3>
                <p className="text-sm text-yellow-100/80 leading-relaxed">{faq.answer}</p>
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
      <footer className="border-t border-white/5 bg-black py-10 text-yellow-100/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="Rellio compass logo" className="h-6 w-6 object-contain" loading="lazy" />
              )}
              <span className="font-serif tracking-widest text-yellow-200">RELLIO</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="/terms" className="text-xs hover:text-yellow-200 transition-colors">Terms</a>
              <a href="/privacy" className="text-xs hover:text-yellow-200 transition-colors">Privacy</a>
              <div className="flex items-center gap-4">
                <a href="https://x.com/rellio" className="hover:text-yellow-200 transition-colors" aria-label="Follow us on X">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://facebook.com/rellio" className="hover:text-yellow-200 transition-colors" aria-label="Follow us on Facebook">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="https://instagram.com/rellio" className="hover:text-yellow-200 transition-colors" aria-label="Follow us on Instagram">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348zm7.718 0c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs">
            © {new Date().getFullYear()} Rellio. All rights reserved. Guiding wisdom across spiritual traditions.
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}