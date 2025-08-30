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
  Sparkles,
} from "lucide-react";

export default function LandingPage({
  bgUrl = "/assets/rellio-hero.jpg",
  logoUrl = "/assets/rellio-logo-gold.png",
}: {
  bgUrl?: string;
  logoUrl?: string;
} = {}) {
  const [offset, setOffset] = useState(0);
  const [, setLocation] = useLocation();
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
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
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Rellio compass logo"
                  className="h-8 w-8 object-contain animate-pulse [animation-duration:3s]"
                  loading="eager"
                />
              )}
              <span className="font-serif tracking-widest text-xl text-yellow-200">RELLIO</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm text-yellow-100/80">
              <a href="#features" className="hover:text-yellow-200 transition-colors">Features</a>
              <a href="#about" className="hover:text-yellow-200 transition-colors">About</a>
              <a href="#faq" className="hover:text-yellow-200 transition-colors">FAQ</a>
              <a href="#auth" className="ml-2 rounded-full border border-yellow-200/30 px-4 py-1.5 text-yellow-100 hover:bg-yellow-200/10 transition-colors">Sign Up</a>
            </nav>
            <button className="md:hidden text-yellow-200" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* HERO SECTION */}
        <section aria-label="Rellio hero" className="relative isolate flex min-h-screen items-center justify-center overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
            style={{
              backgroundImage: `url(${bgUrl})`,
              transform: `translateY(${prefersReduced ? 0 : offset * 0.6}px)`,
              willChange: "transform",
            }}
          />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/20 to-black/50" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_60%,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_40%,rgba(0,0,0,0.55)_100%)]" />
          
          <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 pt-28 pb-24 text-center">
            <div className="mx-auto mb-6 flex items-center justify-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Rellio compass logo"
                  className="h-8 w-8 object-contain animate-pulse [animation-duration:3s]"
                  loading="eager"
                />
              )}
              <span className="font-serif tracking-widest text-xl text-yellow-200">RELLIO</span>
            </div>
            
            <p className="mx-auto max-w-3xl text-base md:text-lg text-yellow-100/80 mb-12">
              One Scripture Across Worlds<br />
              <span className="text-yellow-200 text-xl md:text-2xl font-serif">Guiding Wisdom. Eternal Connection.</span><br />
              Discover insights across traditions. Ask, compare, and learn with scholar-grade AI.
            </p>
            
            {/* Sacred Circle Design */}
            <div className="relative mx-auto mb-12 w-full max-w-5xl h-[600px] md:h-[700px]">
              {/* Central Golden Orb */}
              <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[0_0_80px_rgba(255,215,0,0.8)] z-30 animate-pulse [animation-duration:3s]" />
              
              {/* Central Person Silhouette */}
              <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-20 h-32 z-20">
                <div className="w-full h-full bg-black rounded-t-full" style={{clipPath: 'polygon(30% 0%, 70% 0%, 80% 15%, 85% 25%, 85% 40%, 75% 50%, 80% 65%, 85% 80%, 85% 100%, 15% 100%, 15% 80%, 20% 65%, 25% 50%, 15% 40%, 15% 25%, 20% 15%)'}} />
              </div>
              
              {/* Five Sacred Scripture Books in Circle */}
              {[
                {
                  name: 'TORAH',
                  religion: 'judaism',
                  symbol: '✡',
                  position: { top: '15%', left: '25%' },
                  rotation: '-30deg',
                  colors: 'from-yellow-600 to-yellow-800 border-yellow-400',
                  hoverColors: 'hover:from-yellow-500 hover:to-yellow-700 hover:border-yellow-300 hover:brightness-120'
                },
                {
                  name: 'QURAN',
                  religion: 'islam',
                  symbol: 'ﷲ',
                  position: { top: '8%', left: '50%', transform: 'translateX(-50%)' },
                  rotation: '0deg',
                  colors: 'from-teal-600 to-teal-800 border-teal-400',
                  hoverColors: 'hover:from-teal-500 hover:to-teal-700 hover:border-teal-300 hover:brightness-120'
                },
                {
                  name: 'BIBLE',
                  religion: 'christianity',
                  symbol: '✝',
                  position: { top: '15%', right: '25%' },
                  rotation: '30deg',
                  colors: 'from-blue-600 to-blue-800 border-blue-400',
                  hoverColors: 'hover:from-blue-500 hover:to-blue-700 hover:border-blue-300 hover:brightness-120'
                },
                {
                  name: 'TRIPITAKA',
                  religion: 'buddhism',
                  symbol: '☸',
                  position: { bottom: '25%', left: '20%' },
                  rotation: '-45deg',
                  colors: 'from-purple-600 to-purple-800 border-purple-400',
                  hoverColors: 'hover:from-purple-500 hover:to-purple-700 hover:border-purple-300 hover:brightness-120'
                },
                {
                  name: 'BHAGAVAD\nGITA',
                  religion: 'hinduism',
                  symbol: 'ॐ',
                  position: { bottom: '25%', right: '20%' },
                  rotation: '45deg',
                  colors: 'from-orange-600 to-orange-800 border-orange-400',
                  hoverColors: 'hover:from-orange-500 hover:to-orange-700 hover:border-orange-300 hover:brightness-120'
                }
              ].map((book, index) => (
                <div key={book.name} className="absolute">
                  <div className="absolute" style={book.position}>
                    {/* Golden Connecting Line to Center */}
                    <div 
                      className="absolute w-[2px] h-40 md:h-52 bg-gradient-to-b from-yellow-400/80 via-yellow-300/60 to-transparent origin-bottom z-10"
                      style={{
                        left: '50%',
                        bottom: '100%',
                        transform: `translateX(-50%) rotate(${
                          book.name === 'TORAH' ? '65deg' :
                          book.name === 'QURAN' ? '90deg' :
                          book.name === 'BIBLE' ? '115deg' :
                          book.name === 'TRIPITAKA' ? '25deg' : '155deg'
                        })`,
                        transformOrigin: 'bottom center'
                      }}
                    />
                    
                    {/* Scripture Book */}
                    <button
                      onClick={() => handleScriptureClick(book.religion)}
                      className={`group relative w-24 h-32 md:w-28 md:h-36 rounded-lg border-2 bg-gradient-to-br ${book.colors} ${book.hoverColors} backdrop-blur-sm transition-all duration-500 hover:scale-110 z-20 shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
                      style={{ transform: `rotate(${book.rotation})` }}
                      title={`Explore ${book.name.replace('\n', ' ')}`}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                        <div className="text-2xl md:text-3xl mb-2 text-yellow-100 drop-shadow-lg">{book.symbol}</div>
                        <div className="text-xs font-serif text-yellow-100 text-center leading-tight whitespace-pre-line font-bold tracking-wider drop-shadow-md">{book.name}</div>
                      </div>
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Floating Religious Symbols */}
              <div className="absolute top-[20%] right-[15%] text-2xl text-yellow-300/60 animate-float">✝</div>
              <div className="absolute bottom-[35%] right-[10%] text-xl text-yellow-300/60 animate-float [animation-delay:1s]">☯</div>
              <div className="absolute top-[25%] left-[10%] text-xl text-yellow-300/60 animate-float [animation-delay:2s]">☸</div>
              <div className="absolute bottom-[40%] left-[15%] text-2xl text-yellow-300/60 animate-float [animation-delay:0.5s]">ॐ</div>
            </div>
            
            {/* CTAs */}
            <div className="mx-auto mt-8 flex flex-col items-center justify-center gap-6">
              <button
                onClick={handleGetStarted}
                className="group inline-flex items-center justify-center rounded-lg border-2 border-yellow-300/50 bg-transparent px-12 py-4 font-serif text-base font-semibold tracking-[0.3em] text-yellow-200 transition-all duration-300 hover:border-yellow-200 hover:bg-yellow-200/10 hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                aria-label="Enter the Rellio spiritual community"
              >
                ENTER THE CIRCLE
              </button>
              <button
                onClick={handleWatchDemo}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-500 px-10 py-3 font-serif text-sm font-semibold tracking-[0.2em] text-black transition-all duration-300 hover:from-yellow-500 hover:to-yellow-400 hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                aria-label="Explore sacred scriptures"
              >
                EXPLORE SCRIPTURES
              </button>
            </div>
            
            {/* Scroll Cue */}
            <div className="mt-16 flex justify-center">
              <div className="h-10 w-6 rounded-full border border-yellow-200/30 flex items-start justify-center p-1">
                <div className="h-2 w-1 rounded-full bg-yellow-200/70 animate-bounce" />
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="bg-[#0c0f12] py-24 text-yellow-100/85">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-serif text-2xl tracking-[0.3em] text-yellow-200 mb-16 text-center">FEATURES</h2>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* AI Sage Scholar */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-8 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-6 w-16 h-16 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-yellow-200" />
                </div>
                <h3 className="mb-4 font-serif text-yellow-200 font-semibold text-xl tracking-wide">AI Sage Scholar</h3>
                <p className="text-sm text-yellow-100/80 leading-relaxed">
                  Engage with specialized religious personas - Islamic Mufti, Christian Priest, Jewish Rabbi, Hindu Guru, Buddhist Monk - for authentic theological guidance.
                </p>
              </div>

              {/* Parallel Scriptures */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-8 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-6 w-16 h-16 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <Search className="h-8 w-8 text-yellow-200" />
                </div>
                <h3 className="mb-4 font-serif text-yellow-200 font-semibold text-xl tracking-wide">Parallel Scriptures</h3>
                <p className="text-sm text-yellow-100/80 leading-relaxed">
                  Compare verses across traditions. Find common themes and unique insights from Bible, Qur'an, Torah, Bhagavad Gita, and Tripitaka.
                </p>
              </div>

              {/* Voice & Real-time */}
              <div className="rounded-2xl border border-yellow-300/30 bg-gradient-to-br from-yellow-900/20 to-black/80 p-8 text-center hover:border-yellow-200/50 transition-all duration-300">
                <div className="mx-auto mb-6 w-16 h-16 rounded-full border border-yellow-300/50 flex items-center justify-center">
                  <Volume2 className="h-8 w-8 text-yellow-200" />
                </div>
                <h3 className="mb-4 font-serif text-yellow-200 font-semibold text-xl tracking-wide">Voice & Real-time</h3>
                <p className="text-sm text-yellow-100/80 leading-relaxed">
                  Experience voice-first interactions with real-time responses. Speak your questions and receive spoken wisdom from ancient texts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION */}
        <section id="about" className="bg-gradient-to-r from-black to-indigo-900 py-24 text-yellow-100/85">
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

        {/* FOOTER */}
        <footer className="bg-black py-16 text-yellow-100/50 border-t border-yellow-200/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {/* Logo and Navigation */}
            <div className="text-center mb-12">
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
                <a href="#faq" className="hover:text-yellow-200 transition-colors">FAQ</a>
                <a href="/privacy" className="hover:text-yellow-200 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-yellow-200 transition-colors">Terms</a>
              </div>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex justify-center gap-6 mb-8">
              <a href="https://x.com/rellio" className="w-10 h-10 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on X">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://facebook.com/rellio" className="w-10 h-10 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on Facebook">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://instagram.com/rellio" className="w-10 h-10 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on Instagram">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348zm7.718 0c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
            
            {/* Copyright */}
            <div className="text-center text-xs border-t border-yellow-200/10 pt-8">
              © {new Date().getFullYear()} Rellio. All rights reserved. Guiding wisdom across spiritual traditions.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}