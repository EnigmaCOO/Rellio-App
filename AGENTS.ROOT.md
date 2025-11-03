# Rellio-App-main/AGENTS.ROOT.md
## Purpose
This repository powers **Rellio**, a next-generation **spiritual knowledge and conversation platform** that blends AI, scripture, and voice interaction into a unified experience.  
It enables users to **explore verses across multiple faiths**, **chat with AI scholars (personas)**, **listen to recitations**, and **receive personalized spiritual reflections** — all through an immersive, artistic interface.

Each directory in this repo functions as an **independent agent** within a larger ecosystem — with clear inputs, outputs, and collaboration handoffs.

This document outlines:
1. Each agent’s purpose and interconnection.
2. The technology topology of the Rellio ecosystem.
3. A **roadmap of tasks and milestones** toward Rellio’s ultimate launch goals.

---

## SYSTEM OVERVIEW

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

---

## AGENT TOPOLOGY (SYSTEM MAP)

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

---

## PLATFORM GOALS

### Vision
To build the **world’s first AI-powered universal scripture companion**, where wisdom from **Islamic, Christian, Hindu, Jewish, and global philosophical traditions** converge through voice, visuals, and AI dialogue.

### Core Objectives
1. **Seamless Scripture Exploration** — multi-faith library with real-time verse explanation, cross-comparison, and voice recitation.
2. **AI Sage Personas** — lifelike 3D scholars (e.g., Islamic Mufti, Christian Theologian, Hindu Guru, Universal Sage).
3. **Voice-first Interaction** — natural speech queries with AI-generated responses and emotional TTS.
4. **Immersive Artistry** — each persona environment rendered as a dynamic, ambient digital painting (IlluminVerse).
5. **Daily Guidance Engine** — verse of the day, spiritual journal, and reflection tracker.
6. **Community & Discussion** — faith-respectful, AI-moderated conversation threads.

---

## TASKS TOWARD END GOAL

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
| **Scripture Viewer** | - Implement 3-pane layout (faith selector, verse card, AI pane)<br>- Integrate smooth navigation & highlight syncing<br>- Add “Compare perspectives” & “Explain verse” quick buttons |
| **Chat UI** | - Persona chat interface with contextual bubbles & verse linking<br>- Live voice chat integration with WS<br>- AI response with streaming text + TTS playback |
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

## LONG-TERM EXTENSIONS

| Feature | Description |
|----------|--------------|
| **AR Scripture Exploration** | Augmented-reality Bible/Qur’an verse experience |
| **3D Sage Hub** | Virtual environment where personas “speak” in cinematic visuals |
| **Personal AI Diary** | Reflective journaling assistant powered by embeddings |
| **Scholar API** | Developer API for scripture Q&A in other apps |
| **Interfaith Debates** | Multi-agent discourse between personas for educational purposes |

---

## END VISION STATEMENT

> *Rellio isn’t just an app — it’s a movement to unite wisdom, voice, and design into a single, transcendent platform.*
>
> Each agent in this repo contributes toward that mission:
> - The **server** brings divine text to life through AI reasoning.  
> - The **client** paints it in light and motion.  
> - The **shared** schema binds truth and structure together.  
> - The **voice** unites it all — letting users converse with knowledge itself.  

The ultimate goal is **to make spirituality interactive, intelligent, and inclusive** — one verse, one voice, one soul at a time.
