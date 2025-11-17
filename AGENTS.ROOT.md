# Rellio Project Blueprint & Agent Charter

This repository powers **Rellio**, a next-generation **spiritual knowledge and conversation platform** that blends AI, scripture, and voice interaction into a unified experience. It enables users to **explore verses across multiple faiths**, **chat with AI scholars (personas)**, **listen to recitations**, and **receive personalized spiritual reflections** through immersive, artistic interfaces.

Each directory in this repo functions as an **independent agent** within a larger ecosystem — with clear inputs, outputs, and collaboration handoffs. This document merges the original agent charter with the latest product blueprint so every contributor stays aligned on purpose, scope, and execution.

---

## 1. Vision & Core Idea
Rellio is a multi-faith spiritual intelligence platform designed to bridge ancient wisdom with modern technology. Its mission is to digitally unify the world’s scriptures and spiritual traditions through a single, immersive experience — enabling users to read, reflect, and converse with AI-guided spiritual scholars across all faiths.

### Core Vision
To build the **world’s first AI-driven universal scripture companion** that transcends religious boundaries, cultivates understanding, and brings faith and technology into harmony.

---

## 2. Strategic Objectives (Expanded)
- **Universal Wisdom Access:** Offer a central digital space for all major world scriptures with AI-assisted understanding.
- **AI Persona Depth:** Build lifelike, voice-enabled spiritual personas — each representing different traditions (Mufti, Priest, Rabbi, Monk, Guru, Universal Sage).
- **Immersive Learning Environment:** Thematic backgrounds, ambient audio, contextual storytelling for emotional and spiritual immersion.
- **Cross-Faith Dialogue:** Compare scriptures across religions with ethical, unbiased AI interpretation.
- **Voice-First Interaction:** Integrate TTS & ASR for conversational, hands-free spiritual exploration.
- **Community & Reflection:** Save reflections, share verses, and engage in guided daily spiritual journeys.
- **Interactive Book Browsing:** Tactile scripture explorer with voice narration, persona annotations, and cross-text comparison that feels native on mobile.
- **Persona Previews & Voices:** Lifelike 3D-ready scholar spotlights with interactive bios, animated greeting loops, and instant chat/vocal handoff.
- **Daily Guidance Engine:** Verse of the day, spiritual journal, and reflection tracker.
- **Community & Discussion:** Faith-respectful, AI-moderated conversation threads.

> **Alignment Protocol:** Every agent touching these goals must reference this charter (see nested AGENTS files) before scoping work. Automation scripts and external collaborators should surface the "Interactive Browsing / Persona Previews / 3D Dashboard" mantra in kickoff logs.

---

## 3. System Overview

### Core Stack
| Layer | Description |
|-------|--------------|
| **Frontend** | React 18 + Vite + Tailwind + ShadCN/UI + Framer Motion |
| **Backend** | Node.js (Express) + TypeScript + Drizzle ORM (Postgres) |
| **AI Layer** | OpenAI (GPT models), ElevenLabs (TTS), Scripture Intelligence Engine |
| **Storage** | Postgres (Neon/Local), Redis (Sessions), Cloud Storage (Assets) |
| **Voice & Realtime** | WebSocket VoiceHandler (`/ws/voice`) |
| **Auth** | Firebase Auth (OTP), OAuth (Google), JWT sessions |
| **Deployment** | Replit / Vercel frontend; Render / Railway backend |

### Agent Topology (System Map)
| Agent | Function | Primary Handoff |
|--------|-----------|----------------|
| `/server` | Backend API, WS, AI & scripture logic | → `/client` |
| `/server/services/*` | Domain logic (auth, AI, scripture, notifications) | ↔ `/shared` |
| `/server/websockets` | Handles voice I/O streams | ↔ `/client/src/hooks/useVoiceSocket` |
| `/client` | React SPA | ← `/server` |
| `/client/src/components/*` | Modular UI & pages | ↔ `/client/src/hooks`, `/client/src/lib` |
| `/shared` | Schema, types, validators | ↔ both client & server |
| `/public` | Static files served via Express | ↔ Browser |
| `/attached_assets` | Design assets, generated art | → `/client/public/assets` |
| `/replit.md` & automation scripts | External collaborators & CI prompts | ↔ All agents |

---

## 4. Platform Goals

### Vision
To build the **world’s first AI-powered universal scripture companion**, where wisdom from **Islamic, Christian, Hindu, Jewish, and global philosophical traditions** converge through voice, visuals, and AI dialogue.

### Core Objectives (2025 Charter Refresh)
1. **Interactive Book Browsing** — a tactile scripture explorer with voice narration, persona annotations, and cross-text comparison that feels native on mobile.
2. **Persona Previews & Voices** — lifelike 3D-ready scholar spotlights (Priest, Mufti, Universal Guide) with interactive bios, animated greeting loops, and instant chat/vocal handoff.
3. **Real-time 3D Dashboard** — a cinematic control center that merges IlluminVerse scenes, reading progress, and persona presence into a responsive, multi-faith cockpit.
4. **Voice-first Interaction** — natural speech queries with AI-generated responses and emotional TTS.
5. **Immersive Artistry** — each persona environment rendered as a dynamic, ambient digital painting (IlluminVerse) that scales into 3D when the dashboard activates.
6. **Daily Guidance Engine** — verse of the day, spiritual journal, and reflection tracker.
7. **Community & Discussion** — faith-respectful, AI-moderated conversation threads.

---

## 5. Timeline & Development Phases

| **Phase** | **Timeline** | **Milestones** | **Deliverables** |
|----------|--------------|----------------|------------------|
| **Phase 1 – Foundation** | Jan–Mar 2025 | Core scripture viewer, basic verse navigation | Multi-scripture API, three-pane UI |
| **Phase 2 – Intelligence Layer** | Apr–Jun 2025 | Launch Sage Scholar AI | OpenAI integration, persona chat, cross-referencing |
| **Phase 3 – Immersive Experience** | Jul–Sep 2025 | Visual & auditory immersion | Persona environments, ambient sound, illustrations |
| **Phase 4 – Voice & Reflection** | Oct–Dec 2025 | Voice-first capabilities | TTS, STT, reflection logging, shareable verse stories |
| **Phase 5 – Global Launch** | Jan–Mar 2026 | Cross-platform expansion | Mobile-first PWA, multi-language support, subscriptions |

---

## 6. Target Audience & Market Positioning

### Audience Segments
| Segment | Profile | Motivation | How Rellio Serves Them |
|--------|---------|------------|--------------------------|
| **Spiritual Seekers** | Ages 18–45 exploring cross-faith paths | Inner peace, comparative religion | AI conversation & verse comparison |
| **Students & Academics** | Theology, philosophy | Quick reference & study tools | Context-aware scripture search |
| **Faithful Practitioners** | Devout readers | Recitation & reflection | Personalized verse recommendations |
| **Modern Mindfulness Users** | Non-religious but spiritually open | Guidance & meditation | Universal Wisdom persona |
| **Interfaith Organizations** | NGOs, educators | Promote unity & dialogue | Multi-faith harmony tools |

### Market Positioning
Rellio sits at the intersection of **FaithTech** and **Cognitive AI** — a *spiritual intelligence ecosystem*, not a religious app.

---

## 7. Feature Matrix

| Category | Current Features | Planned / Needed Features | Future Enhancements |
|----------|------------------|----------------------------|----------------------|
| **Core Scripture System** | Multi-scripture DB | Bookmarks, multi-language | Visual verse alignment |
| **AI Scholar System** | Universal Sage Scholar | Dedicated personas | 3D voice avatars |
| **User Interface** | Three-pane layout | Thematic persona backgrounds | AR spiritual exploration |
| **Voice Integration** | ElevenLabs prototype | Full voice chat | Multilingual dialogue |
| **Community Layer** | Reflection concept | Daily journal, shareable moments | Growth tracker, karma system |
| **Design & Branding** | Cosmic white-gold palette | Motion design, hero art | Animated onboarding |

---

## 8. Gap Analysis: Needed vs. Current State

| Aspect | Currently Have | Need to Build / Acquire |
|--------|----------------|--------------------------|
| **Backend Infrastructure** | Scripture model, API | Redis/Prisma caching, optimized queries |
| **AI Layer** | Base OpenAI integration | Persona tuning, context caching, ethical guardrails |
| **Design System** | Tailwind + ShadCN | Full Figma design system |
| **Audio/Voice** | Basic ElevenLabs | Bi-directional speech system |
| **UI/UX** | Static persona screens | Interactive environments |
| **Security** | Basic auth | Encrypted journals |
| **Monetization** | None | Subscription tiers |
| **Analytics** | None | Usage insights, engagement metrics |

---

## 9. Tasks Toward End Goal

### 🧱 Phase 1 — Foundation & Infrastructure
**Goal:** Establish core architecture & environment for full-stack AI interactions.

| Area | Task |
|------|------|
| **Server Setup** | - Configure Express, Helmet, rate limiting, sessions (Redis)<br>- Implement OpenAI, ElevenLabs, Scripture APIs<br>- Define `/api/scripture`, `/api/persona`, `/api/compare`, `/api/explain` routes |
| **Database** | - Create Drizzle schema for Users, Verses, Personas, Reflections, AudioCache<br>- Seed initial scripture data (Qur’an, Bible, Bhagavad Gita) |
| **Shared Types** | - Define schema types & zod validators in `/shared/schema.ts` |
| **Auth** | - Firebase OTP & Google OAuth integration<br>- Session tokens & secure cookies |
| **Security** | - Add Helmet, CSP, CSRF, input sanitization |
| **Testing** | - Add Jest or Vitest baseline; smoke tests for APIs |

---

### 💫 Phase 2 — Frontend & Experience
**Goal:** Build the immersive UI & verse experience.

| Area | Task |
|------|------|
| **Interactive Scripture Viewer** | - Implement 3-pane layout (faith selector, verse card, AI pane)<br>- Add persona-tinted annotations and hoverable preview chips |
| **Chat & Persona Preview** | - Persona chat interface with contextual bubbles & verse linking<br>- Quick persona preview modals featuring Priest, Mufti, Universal Guide |
| **IlluminVerse Backgrounds** | - Animated environment (mosque, cathedral, temple, cosmic)<br>- Dynamic lighting & particle ambience based on persona |
| **UI System** | - Build reusable components (Modal, Button, Card, Toast)<br>- Implement dark/light modes with Tailwind |
| **State Management** | - TanStack Query for data<br>- Zustand for app state (persona, theme, verse) |

---

### 🔊 Phase 3 — Voice Intelligence & Realtime Layer
**Goal:** Enable voice-first interactions.

| Area | Task |
|------|------|
| **WebSocket VoiceHandler** | - Implement `/ws/voice` handler<br>- Stream audio between user mic and ElevenLabs TTS<br>- Parse partial text for live subtitle display |
| **Voice Recorder Hook** | - `useVoiceSocket()` with heartbeat & reconnection logic |
| **Audio Pipeline** | - Binary audio frame handling<br>- Backpressure management & timeouts |
| **Edge Optimizations** | - Deploy WS on regional server for low latency |
| **Speech-to-Text** | - Integrate Whisper or Web Speech API for client recognition |

---

### 🧠 Phase 4 — Sage Scholar AI Engine
**Goal:** Enable persona-driven spiritual reasoning.

| Area | Task |
|------|------|
| **Persona Engine** | - Define personality profiles per faith (`/server/services/xai.ts`)<br>- Add tone modifiers & scripture linking logic |
| **Context Memory** | - Save chat context per session/user in DB |
| **Comparison Layer** | - Multi-scripture comparison function for verses<br>- Output with respectful theological tone |
| **Moderation & Filters** | - Integrate OpenAI moderation API<br>- Create safe-response fallback messages |
| **Training Hooks** | - Persona prompt templates (IslamicScholar, ChristianTheologian, etc.) |

---

### 🌍 Phase 5 — Social & Community Layer
**Goal:** Enable Rellio as a shared, uplifting social space.

| Area | Task |
|------|------|
| **Profiles & Journals** | - User reflections, verse favorites, progress tracking |
| **Community Feed** | - AI-moderated posts & spiritual discussions |
| **Notifications** | - Email/SMS triggers for daily verse & journal reminders |
| **Gamification** | - Streaks, badges, personalized challenges |
| **Privacy Controls** | - Anonymous mode for sensitive faith questions |

---

### 🚀 Phase 6 — Deployment & Launch
**Goal:** Production deployment, testing, and public release.

| Area | Task |
|------|------|
| **CI/CD** | - GitHub Actions for testing + build<br>- Replit or Railway staging environment |
| **Monitoring** | - Log ingestion (Pino), error tracking (Sentry) |
| **Performance** | - Code splitting, caching, image optimization |
| **Marketing Site** | - Landing page for Rellio with persona previews |
| **Beta Launch** | - Invite-only user testing (Islamic & Christian modules first) |
| **Global Launch** | - Public rollout with 5 personas and multilingual support |

---

## 10. Timeline, KPIs & Execution Plan

### Development Stack
- Next.js + React + TailwindCSS
- Prisma + PostgreSQL
- Voice: Web Speech API + ElevenLabs
- AI: OpenAI GPT-5 with persona contexts
- Deployment: Replit Cloud + Vercel + Supabase/Neon

### Key KPIs
- Scripture loading time: **< 2 seconds**
- AI response latency: **< 1.5 seconds**
- DAU Target: **10K by Q3 2026**
- Persona retention: **60% returning to same persona**
- Reflection engagement: **3 reflections/week/user**
- Subscription conversion: **8–12%**

---

## 11. Long-Term Extensions

| Feature | Description |
|----------|--------------|
| **AR Scripture Exploration** | Augmented-reality Bible/Qur’an verse experience |
| **3D Sage Hub** | Virtual environment where personas “speak” in cinematic visuals |
| **Personal AI Diary** | Reflective journaling assistant powered by embeddings |
| **Scholar API** | Developer API for scripture Q&A in other apps |
| **Interfaith Debates** | Multi-agent discourse between personas for educational purposes |

---

## 12. Success Metrics & Next Steps

### Success Metrics
- Emotional resonance & trust
- Cultural and interfaith inclusivity
- Seamless interaction between scripture, chat, and voice
- Scalable AI architecture for new traditions
- Organic growth via educators & influencers

### Immediate Next Steps (Q4 2025)
- Finalize verse + persona backend schema
- Integrate voice for all personas
- Launch Daily Verse + Reflection Beta
- Refine persona art & environments
- Begin closed beta (200 users globally)

---

## 13. End Vision Statement
> *Rellio isn’t just an app — it’s a movement to unite wisdom, voice, and design into a single, transcendent platform.*
>
> Each agent in this repo contributes toward that mission:
> - The **server** brings divine text to life through AI reasoning.
> - The **client** paints it in light and motion.
> - The **shared** schema binds truth and structure together.
> - The **voice** unites it all — letting users converse with knowledge itself.
>
> The ultimate goal is **to make spirituality interactive, intelligent, and inclusive** — one verse, one voice, one soul at a time.

