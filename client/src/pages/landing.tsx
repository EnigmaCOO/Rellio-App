import { useMemo, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import {
  Menu,
  X,
  Compass,
  BookOpen,
  Volume2,
  Sparkles,
  Globe,
  MessageCircle,
  ArrowRight,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BookCarousel, type FaithLibrary } from "@/components/landing/BookCarousel";
import { PersonaShowcase, type PersonaPreview } from "@/components/landing/PersonaShowcase";
import ExperienceAIWisdom from "@/components/ExperienceAIWisdom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Religion } from "@shared/schema";
import compassLogo from "@assets/rellio-compass-logo.png";

type ExplorerRouteOptions = {
  religion?: Religion;
  book?: string;
  personaId?: string;
  view?: string;
};

const buildExplorerRoute = ({ religion, book, personaId, view }: ExplorerRouteOptions) => {
  const params = new URLSearchParams();

  if (religion) {
    params.set("religion", religion);
  }

  if (book) {
    params.set("book", book);
  }

  if (personaId) {
    params.set("persona", personaId);
  }

  if (view) {
    params.set("view", view);
  }

  const query = params.toString();
  return `/dashboard${query ? `?${query}` : ""}`;
};

const heroMetrics = [
  {
    label: "Faiths",
    value: "5+",
    description: "Major traditions with guided study pathways",
  },
  {
    label: "Personas",
    value: "8",
    description: "Scholar voices ready for dialogue and reflection",
  },
  {
    label: "Voice",
    value: "Live",
    description: "Hands-free prompts with pause and resume control",
  },
  {
    label: "Explorer",
    value: "Universal",
    description: "Compare verses and contexts in one shared canvas",
  },
];

const faqItems = [
  {
    question: "How does the Universal Wisdom Explorer work?",
    answer:
      "Select a book or persona and Rellio orchestrates scripture, commentary, and AI-guided conversation in a single responsive workspace.",
  },
  {
    question: "Can I speak to the personas with my voice?",
    answer:
      "Yes. Voice prompts stream into the chat, and the persona pauses automatically whenever you speak so the dialogue feels natural and respectful.",
  },
  {
    question: "Which traditions are available today?",
    answer:
      "Christianity, Islam, Judaism, Hinduism, and Buddhism are live now with curated libraries. Additional traditions are on our roadmap.",
  },
  {
    question: "Do I need an account to explore?",
    answer:
      "You can browse highlights without signing in. Creating an account unlocks personalised journeys, saved reflections, and community spaces.",
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const faithLibraries = useMemo<FaithLibrary[]>(() => [
    {
      id: "christianity",
      name: "Christian Wisdom",
      tagline: "Gospels, letters, and psalms curated for guided devotion.",
      accent: "rgba(99, 102, 241, 0.2) 0%, rgba(147, 51, 234, 0.12) 100%",
      glow: "shadow-[0_0_40px_rgba(129,140,248,0.25)]",
      voicePrompt: "Lead me through the Beatitudes and invite a moment for prayer.",
      books: [
        {
          id: "JOHN",
          title: "Gospel of John",
          description: "Experience the poetic proclamation of the Word with live cross references.",
          route: buildExplorerRoute({ religion: "christianity", book: "John", view: "scripture" }),
          highlight: "“The light shines in the darkness, and the darkness has not overcome it.”",
          livePreview: (
            <p className="text-sm leading-relaxed text-yellow-100/80">
              Illuminated passages align with prophetic voices from Isaiah, guiding a meditative reading rhythm.
            </p>
          ),
        },
        {
          id: "PSALMS",
          title: "Book of Psalms",
          description: "Reflective worship with adaptive music beds and journaling cues.",
          route: buildExplorerRoute({ religion: "christianity", book: "Psalms", view: "scripture" }),
          highlight: "“Create in me a clean heart, O God, and renew a right spirit within me.”",
        },
        {
          id: "ACTS",
          title: "Acts of the Apostles",
          description: "Follow the early church with persona insights on community and mission.",
          route: buildExplorerRoute({ religion: "christianity", book: "Acts", view: "scripture" }),
        },
      ],
    },
    {
      id: "islam",
      name: "Islamic Guidance",
      tagline: "Recite the Qur'an with tajweed-aware voice prompts.",
      accent: "rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.12) 100%",
      glow: "shadow-[0_0_40px_rgba(34,197,94,0.25)]",
      voicePrompt: "Recite Surah Al-Fatiha slowly and pause so I can repeat it after you.",
      books: [
        {
          id: "AL-FATIHA",
          title: "Surah Al-Fatiha",
          description: "Hear authentic recitation while the AI scholar explains each verse with reverence.",
          route: buildExplorerRoute({ religion: "islam", book: "Al-Fatiha", view: "scripture" }),
          highlight: "Bismillah ar-Rahman ar-Raheem — begin in the Name of the Most Compassionate, Most Merciful.",
        },
        {
          id: "YA-SIN",
          title: "Surah Ya-Sin",
          description: "Engage with heart-soothing passages using immersive call-and-response mode.",
          route: buildExplorerRoute({ religion: "islam", book: "Ya-Sin", view: "scripture" }),
        },
        {
          id: "AL-KAHF",
          title: "Surah Al-Kahf",
          description: "Weekly reflections with reminders and voice-led pauses for du'a.",
          route: buildExplorerRoute({ religion: "islam", book: "Al-Kahf", view: "scripture" }),
        },
      ],
    },
    {
      id: "judaism",
      name: "Jewish Heritage",
      tagline: "Walk Torah portions with cantillation-aware narration.",
      accent: "rgba(59, 130, 246, 0.18) 0%, rgba(14, 165, 233, 0.12) 100%",
      glow: "shadow-[0_0_40px_rgba(14,165,233,0.25)]",
      voicePrompt: "Chant the Shema and invite me to respond in Hebrew.",
      books: [
        {
          id: "GENESIS",
          title: "Sefer Bereshit",
          description: "Trace creation narratives with rabbinic commentary layers at a tap.",
          route: buildExplorerRoute({ religion: "judaism", book: "Genesis", view: "scripture" }),
        },
        {
          id: "EXODUS",
          title: "Sefer Shemot",
          description: "Experience the Exodus journey with persona-led historical context.",
          route: buildExplorerRoute({ religion: "judaism", book: "Exodus", view: "scripture" }),
        },
        {
          id: "PSALMS",
          title: "Tehillim",
          description: "Chant psalms with lyrical translation overlays and voice journaling.",
          route: buildExplorerRoute({ religion: "judaism", book: "Psalms", view: "scripture" }),
        },
      ],
    },
    {
      id: "hinduism",
      name: "Vedic Insights",
      tagline: "Dialogue with the Bhagavad Gita through guided meditation.",
      accent: "rgba(234, 179, 8, 0.24) 0%, rgba(249, 115, 22, 0.12) 100%",
      glow: "shadow-[0_0_45px_rgba(249,115,22,0.2)]",
      voicePrompt: "Recite the opening of Chapter 2 and pause for me to repeat the Sanskrit.",
      books: [
        {
          id: "GITA",
          title: "Bhagavad Gita",
          description: "Journey verse-by-verse with animated battlefield visualisations and mantra loops.",
          route: buildExplorerRoute({ religion: "hinduism", book: "Bhagavad Gita", view: "scripture" }),
        },
        {
          id: "UPANISHADS",
          title: "Upanishads",
          description: "Contemplate the nature of Atman with reflective prompts and soundscapes.",
          route: buildExplorerRoute({ religion: "hinduism", book: "Upanishads", view: "scripture" }),
        },
        {
          id: "RAMAYANA",
          title: "Ramayana",
          description: "Follow Rama's journey with persona narratives and cultural context.",
          route: buildExplorerRoute({ religion: "hinduism", book: "Ramayana", view: "scripture" }),
        },
      ],
    },
    {
      id: "buddhism",
      name: "Buddhist Clarity",
      tagline: "Practice mindful reading with calming visualisations.",
      accent: "rgba(59, 130, 246, 0.16) 0%, rgba(56, 189, 248, 0.12) 100%",
      glow: "shadow-[0_0_40px_rgba(56,189,248,0.22)]",
      voicePrompt: "Guide me through the Metta Sutta with breath cues between verses.",
      books: [
        {
          id: "DHAMMAPADA",
          title: "Dhammapada",
          description: "Receive concise teachings with persona reflections for daily practice.",
          route: buildExplorerRoute({ religion: "buddhism", book: "Dhammapada", view: "scripture" }),
        },
        {
          id: "LOTUS",
          title: "Lotus Sutra",
          description: "Immerse in compassion themes with visual mandala cues.",
          route: buildExplorerRoute({ religion: "buddhism", book: "Lotus Sutra", view: "scripture" }),
        },
        {
          id: "HEART",
          title: "Heart Sutra",
          description: "Chant with a calming beat and persona-guided breath work.",
          route: buildExplorerRoute({ religion: "buddhism", book: "Heart Sutra", view: "scripture" }),
        },
      ],
    },
  ], []);

  const personaPreviews = useMemo<PersonaPreview[]>(() => [
    {
      id: "universal-sage",
      name: "Lumina",
      title: "Universal Sage",
      description:
        "A radiant guide synthesising themes across traditions and inviting respectful dialogue as you read.",
      accent: "rgba(251, 191, 36, 0.22) 0%, rgba(248, 113, 113, 0.12) 100%",
      glow: "shadow-[0_0_45px_rgba(251,191,36,0.25)]",
      voicePrompt: "Illuminate the theme of compassion across the Bible, Qur'an, and Bhagavad Gita.",
      route: buildExplorerRoute({ view: "universal-explorer", personaId: "universal-sage" }),
      livePreview: (
        <p className="text-sm leading-relaxed text-yellow-100/80">
          “Compassion is the resonance of divine love. In the Qur'an it is Rahma, in the Gospels agape, and in the Gita, the steady
          heart of a yogi.”
        </p>
      ),
    },
    {
      id: "mufti-aminah",
      name: "Mufti Aminah",
      title: "Islamic Scholar",
      description: "A warm teacher delivering precise tafsir and tajweed-friendly recitation cues.",
      accent: "rgba(34, 197, 94, 0.24) 0%, rgba(74, 222, 128, 0.14) 100%",
      glow: "shadow-[0_0_40px_rgba(34,197,94,0.22)]",
      voicePrompt: "Explain Ayat al-Kursi and invite me to recite each line after you.",
      route: buildExplorerRoute({ religion: "islam", personaId: "mufti-aminah", view: "scripture" }),
      livePreview: (
        <p className="text-sm leading-relaxed text-yellow-100/80">
          “Let us recite slowly. Feel the cadence, then I will pause so you can repeat the sacred words.”
        </p>
      ),
    },
    {
      id: "pastor-eli",
      name: "Pastor Eli",
      title: "Christian Theologian",
      description: "Offers pastoral insight with contextual history and devotional prompts.",
      accent: "rgba(96, 165, 250, 0.22) 0%, rgba(139, 92, 246, 0.14) 100%",
      glow: "shadow-[0_0_40px_rgba(96,165,250,0.22)]",
      voicePrompt: "Share a reflection on the Good Samaritan and ask me what love looks like today.",
      route: buildExplorerRoute({ religion: "christianity", personaId: "pastor-eli", view: "scripture" }),
    },
    {
      id: "guru-meera",
      name: "Guru Meera",
      title: "Vedic Mentor",
      description: "Guides mindful reading with breath, mantra, and visual focus cues.",
      accent: "rgba(251, 191, 36, 0.18) 0%, rgba(249, 115, 22, 0.12) 100%",
      glow: "shadow-[0_0_42px_rgba(249,115,22,0.22)]",
      voicePrompt: "Lead me through a Gita meditation on dharma with gentle bells between verses.",
      route: buildExplorerRoute({ religion: "hinduism", personaId: "guru-meera", view: "scripture" }),
    },
  ], []);

  const explorerTiles = useMemo(
    () => [
      {
        id: "compare",
        title: "Compare perspectives",
        description: "Place passages side-by-side and hear how each persona interprets them in real time.",
        icon: Globe,
        route: buildExplorerRoute({ view: "universal-explorer", personaId: "universal-sage" }),
      },
      {
        id: "voice",
        title: "Speak & listen",
        description: "Launch voice dialogue with pause detection so your words are always honoured.",
        icon: Volume2,
        route: buildExplorerRoute({ view: "voice" }),
      },
      {
        id: "persona",
        title: "Choose a companion",
        description: "Invite a scholar persona who mirrors your current study goal or mood.",
        icon: MessageCircle,
        route: buildExplorerRoute({ view: "persona-hub" }),
      },
      {
        id: "journey",
        title: "Track your journey",
        description: "Celebrate streaks, reflections, and discoveries with gentle progress insights.",
        icon: Layers,
        route: buildExplorerRoute({ view: "journey" }),
      },
    ] as Array<{ id: string; title: string; description: string; icon: LucideIcon; route: string }>,
    []
  );

  const handleNavigate = useCallback(
    (route: string) => {
      setLocation(route);
      setIsMenuOpen(false);
    },
    [setLocation]
  );

  const handleFaithVoicePrompt = useCallback(
    (prompt: string, meta: { faith: Religion }) => {
      toast({
        title: `Previewing ${meta.faith} voice prompt`,
        description: `“${prompt}”`,
      });
    },
    [toast]
  );

  const handlePersonaVoicePrompt = useCallback(
    (prompt: string, meta: { personaId: string }) => {
      toast({
        title: "Persona voice prompt queued",
        description: `“${prompt}”`,
      });
    },
    [toast]
  );

  return (
    <>
      <Helmet>
        <title>Rellio - Explore Sacred Wisdom with AI</title>
        <meta
          name="description"
          content="Dive into Rellio, an AI-powered platform uniting scriptures from the Bible, Quran, Torah, Bhagavad Gita, and more. Engage with voice chats, scholar personas, and theme-based verse comparisons — enlighten your soul today!"
        />
        <meta property="og:title" content="Rellio - Explore Sacred Wisdom with AI" />
        <meta
          property="og:description"
          content="Dive into Rellio, an AI-powered platform uniting scriptures from the Bible, Quran, Torah, Bhagavad Gita, and more. Engage with voice chats, scholar personas, and theme-based verse comparisons — enlighten your soul today!"
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
          content="Dive into Rellio, an AI-powered platform uniting scriptures from the Bible, Quran, Torah, Bhagavad Gita, and more. Engage with voice chats, scholar personas, and theme-based verse comparisons — enlighten your soul today!"
        />
        <meta name="twitter:image" content={`${currentOrigin}/images/og-image.png`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-black via-[#0b0d11] to-black text-[#E8D18A] selection:bg-yellow-200/20 selection:text-yellow-100">
        <header className="fixed inset-x-0 top-0 z-50 border-b border-yellow-200/10 bg-black/50 backdrop-blur">
          <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => handleNavigate("/")}
              className="flex items-center gap-3"
            >
              <img src={compassLogo} alt="Rellio compass logo" className="h-10 w-10" loading="lazy" />
              <span className="font-serif text-xl tracking-[0.4em] text-yellow-200">RELLIO</span>
            </button>
            <nav className="hidden items-center gap-8 text-sm text-yellow-100/80 md:flex">
              <a href="#explorer" className="transition-colors hover:text-yellow-100">
                Explorer
              </a>
              <a href="#libraries" className="transition-colors hover:text-yellow-100">
                Libraries
              </a>
              <a href="#personas" className="transition-colors hover:text-yellow-100">
                Personas
              </a>
              <a href="#faq" className="transition-colors hover:text-yellow-100">
                FAQ
              </a>
              <Button
                type="button"
                className="border border-yellow-200/40 bg-yellow-200/20 text-yellow-900 hover:bg-yellow-200"
                onClick={() => handleNavigate("/dashboard")}
              >
                Enter app
              </Button>
            </nav>
            <button
              type="button"
              className="rounded-full border border-yellow-200/40 p-2 text-yellow-100 md:hidden"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          {isMenuOpen && (
            <div className="md:hidden">
              <nav className="space-y-1 border-t border-yellow-200/10 bg-black/80 px-4 py-4 text-sm text-yellow-100/80">
                {[
                  { label: "Explorer", href: "#explorer" },
                  { label: "Libraries", href: "#libraries" },
                  { label: "Personas", href: "#personas" },
                  { label: "FAQ", href: "#faq" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="block rounded-xl px-3 py-2 transition-colors hover:bg-yellow-200/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                <Button
                  type="button"
                  className="w-full bg-yellow-200 text-black hover:bg-yellow-300"
                  onClick={() => handleNavigate("/dashboard")}
                >
                  Enter app
                </Button>
              </nav>
            </div>
          )}
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 pb-24 pt-32 sm:px-6 lg:px-8">
          <section id="explorer" className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-yellow-200/40 bg-yellow-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-yellow-200">
                <Compass className="h-4 w-4" />
                Universal Wisdom Explorer
              </span>
              <h1 className="font-serif text-4xl leading-tight text-yellow-50 sm:text-5xl lg:text-6xl">
                Read, speak, and compare sacred wisdom in one responsive sanctuary.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-yellow-100/80">
                Rellio brings scripture, AI personas, and live voice dialogue into a single experience. Start a verse, ask a
                question, compare traditions, and let the conversation pause whenever you speak. The journey is immersive, mobile,
                and deeply respectful.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  type="button"
                  className="h-12 rounded-full bg-yellow-200 text-black hover:bg-yellow-300"
                  onClick={() => handleNavigate(buildExplorerRoute({ view: "universal-explorer" }))}
                >
                  Launch the explorer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-full border-yellow-200/40 bg-transparent text-yellow-100 hover:bg-yellow-200/10"
                  onClick={() => handleNavigate(buildExplorerRoute({ view: "scripture" }))}
                >
                  Browse scriptures
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-yellow-200/20 bg-black/50 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.35em] text-yellow-200/70">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-yellow-50">{metric.value}</p>
                    <p className="mt-2 text-xs leading-relaxed text-yellow-100/70">{metric.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 rounded-3xl border border-yellow-200/20 bg-black/60 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-200/80">
                  Explorer entry points
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {explorerTiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => handleNavigate(tile.route)}
                      className="flex flex-col gap-3 rounded-2xl border border-yellow-200/20 bg-black/50 p-4 text-left transition-all hover:border-yellow-200/50 hover:bg-yellow-200/10"
                    >
                      <tile.icon className="h-5 w-5 text-yellow-200" />
                      <p className="font-serif text-lg text-yellow-50">{tile.title}</p>
                      <p className="text-sm leading-relaxed text-yellow-100/75">{tile.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div id="libraries">
                <BookCarousel
                  libraries={faithLibraries}
                  onNavigate={handleNavigate}
                  onVoicePrompt={handleFaithVoicePrompt}
                />
              </div>
            </div>
          </section>

          <section id="personas">
            <PersonaShowcase
              personas={personaPreviews}
              onNavigate={handleNavigate}
              onVoicePrompt={handlePersonaVoicePrompt}
            />
          </section>

          <section className="rounded-3xl border border-yellow-200/20 bg-black/60 p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-4">
                <h2 className="font-serif text-3xl text-yellow-50">Why Rellio feels like a sacred studio</h2>
                <p className="text-base leading-relaxed text-yellow-100/80">
                  Every interaction is designed for reflection. Start a scripture session, invite a persona, speak your heart, and
                  receive responses grounded in tradition. All of it flows inside a responsive layout that feels at home on mobile
                  and desktop alike.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      title: "Immersive scripture journeys",
                      description: "Adaptive layouts reveal commentary, highlights, and media without losing focus.",
                      icon: BookOpen,
                    },
                    {
                      title: "Voice-first dialogue",
                      description: "Converse naturally with pause-aware audio prompts and expressive playback.",
                      icon: Volume2,
                    },
                    {
                      title: "Persona companionship",
                      description: "Choose guides who reflect diverse traditions and temperaments.",
                      icon: MessageCircle,
                    },
                    {
                      title: "Interfaith comparisons",
                      description: "Line up passages from multiple faiths for deep, respectful exploration.",
                      icon: Globe,
                    },
                  ].map((feature) => (
                    <div
                      key={feature.title}
                      className="flex gap-3 rounded-2xl border border-yellow-200/15 bg-black/40 p-4"
                    >
                      <feature.icon className="h-5 w-5 text-yellow-200" />
                      <div>
                        <p className="font-serif text-lg text-yellow-50">{feature.title}</p>
                        <p className="text-sm leading-relaxed text-yellow-100/75">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-yellow-200/20 bg-black/50 p-6">
                <ExperienceAIWisdom />
              </div>
            </div>
          </section>

          <section id="faq" className="space-y-6">
            <h2 className="font-serif text-3xl text-yellow-50">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqItems.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-yellow-200/20 bg-black/50 p-5 text-yellow-100/80"
                >
                  <summary className="flex cursor-pointer items-center justify-between text-lg text-yellow-50">
                    <span>{faq.question}</span>
                    <Sparkles className="h-4 w-4 text-yellow-200 transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="contact" className="rounded-3xl border border-yellow-200/20 bg-black/60 p-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className="font-serif text-3xl text-yellow-50">Connect with us</h2>
                <p className="text-sm leading-relaxed text-yellow-100/75">
                  Be the first to access new personas, rituals, and community experiences. Our team loves hearing how you weave
                  sacred study into daily life.
                </p>
                <div className="space-y-3 text-sm text-yellow-100/80">
                  <p>Email: hello@rellio.app</p>
                  <p>Phone: +1 (555) RELLIO-1</p>
                  <p>Global: Serving seekers worldwide</p>
                </div>
              </div>
              <form className="grid gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.3em] text-yellow-200/70">Name</label>
                  <input
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-yellow-200/20 bg-black/40 px-4 py-3 text-yellow-100 focus:border-yellow-200/60 focus:outline-none"
                    placeholder="Your sacred name"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.3em] text-yellow-200/70">Email</label>
                  <input
                    type="email"
                    className="mt-2 w-full rounded-2xl border border-yellow-200/20 bg-black/40 px-4 py-3 text-yellow-100 focus:border-yellow-200/60 focus:outline-none"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.3em] text-yellow-200/70">Message</label>
                  <textarea
                    className="mt-2 h-32 w-full rounded-2xl border border-yellow-200/20 bg-black/40 px-4 py-3 text-yellow-100 focus:border-yellow-200/60 focus:outline-none"
                    placeholder="Share your hopes for Rellio"
                  />
                </div>
                <Button type="button" className="rounded-full bg-yellow-200 text-black hover:bg-yellow-300">
                  Send message
                </Button>
              </form>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

