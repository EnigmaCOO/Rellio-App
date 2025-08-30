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
        <section aria-label="Rellio hero" className="relative isolate h-screen overflow-hidden">
          {/* Hero Image Background */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat md:bg-contain"
            style={{
              backgroundImage: `url(/assets/rellio-hero-desktop.png)`,
              transform: `translateY(${prefersReduced ? 0 : offset * 0.3}px)`,
              willChange: "transform",
              backgroundSize: "cover",
              backgroundPosition: "center center",
            }}
          />
          
          {/* Clickable Scripture Areas positioned over the image */}
          <div className="absolute inset-0">
            {/* Torah - Top Left */}
            <button
              onClick={() => handleScriptureClick('judaism')}
              className="absolute top-[22%] left-[20%] w-18 h-26 md:w-22 md:h-30 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(255,215,0,0.8)] z-10"
              title="Explore Torah"
              aria-label="Explore Torah"
            >
              <div className="w-full h-full bg-transparent rounded-lg border-2 border-transparent hover:border-yellow-300/70 hover:bg-yellow-200/10 transition-all duration-300" />
            </button>

            {/* Quran - Top Center */}
            <button
              onClick={() => handleScriptureClick('islam')}
              className="absolute top-[25%] left-1/2 -translate-x-1/2 w-18 h-26 md:w-22 md:h-30 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(0,213,255,0.8)] z-10"
              title="Explore Quran"
              aria-label="Explore Quran"
            >
              <div className="w-full h-full bg-transparent rounded-lg border-2 border-transparent hover:border-teal-300/70 hover:bg-teal-200/10 transition-all duration-300" />
            </button>

            {/* Bible - Top Right */}
            <button
              onClick={() => handleScriptureClick('christianity')}
              className="absolute top-[22%] right-[20%] w-18 h-26 md:w-22 md:h-30 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] z-10"
              title="Explore Bible"
              aria-label="Explore Bible"
            >
              <div className="w-full h-full bg-transparent rounded-lg border-2 border-transparent hover:border-blue-300/70 hover:bg-blue-200/10 transition-all duration-300" />
            </button>

            {/* Tripitaka - Bottom Left */}
            <button
              onClick={() => handleScriptureClick('buddhism')}
              className="absolute top-[50%] left-[15%] w-18 h-26 md:w-22 md:h-30 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(147,51,234,0.8)] z-10"
              title="Explore Tripitaka"
              aria-label="Explore Tripitaka"
            >
              <div className="w-full h-full bg-transparent rounded-lg border-2 border-transparent hover:border-purple-300/70 hover:bg-purple-200/10 transition-all duration-300" />
            </button>

            {/* Bhagavad Gita - Bottom Right */}
            <button
              onClick={() => handleScriptureClick('hinduism')}
              className="absolute top-[50%] right-[15%] w-18 h-26 md:w-22 md:h-30 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:drop-shadow-[0_0_30px_rgba(249,115,22,0.8)] z-10"
              title="Explore Bhagavad Gita"
              aria-label="Explore Bhagavad Gita"
            >
              <div className="w-full h-full bg-transparent rounded-lg border-2 border-transparent hover:border-orange-300/70 hover:bg-orange-200/10 transition-all duration-300" />
            </button>
          </div>
          
          {/* CTAs positioned at bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
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
            
            {/* Scroll Cue */}
            <div className="mt-3 flex justify-center">
              <div className="h-6 w-4 rounded-full border border-yellow-200/40 flex items-start justify-center p-1">
                <div className="h-1 w-1 rounded-full bg-yellow-200/80 animate-bounce" />
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
        <footer className="bg-black py-8 text-yellow-100/50 border-t border-yellow-200/10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            {/* Logo and Navigation */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                {logoUrl && (
                  <img src={logoUrl} alt="Rellio compass logo" className="h-8 w-8 object-contain" loading="lazy" />
                )}
              </div>
              <h2 className="font-serif text-xl tracking-[0.3em] text-yellow-200 mb-4">RELLIO</h2>
              
              {/* Footer Navigation */}
              <div className="flex flex-wrap justify-center gap-6 text-xs">
                <a href="#features" className="hover:text-yellow-200 transition-colors">Features</a>
                <a href="#about" className="hover:text-yellow-200 transition-colors">About</a>
                <a href="#faq" className="hover:text-yellow-200 transition-colors">FAQ</a>
                <a href="/privacy" className="hover:text-yellow-200 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-yellow-200 transition-colors">Terms</a>
              </div>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex justify-center gap-4 mb-4">
              <a href="https://x.com/rellio" className="w-8 h-8 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on X">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://facebook.com/rellio" className="w-8 h-8 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on Facebook">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://instagram.com/rellio" className="w-8 h-8 rounded-full border border-yellow-300/40 flex items-center justify-center hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all duration-300" aria-label="Follow us on Instagram">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348zm7.718 0c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348z" clipRule="evenodd" />
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