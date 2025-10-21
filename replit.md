# Rellio Scripture Library Application

## Overview
Rellio is a full-stack web application designed for comprehensive scripture study across multiple religious texts (Bible, Quran, Torah, Bhagavad Gita, Tripitaka). It integrates an AI chatbot for contextual discussions and provides a rich reading experience. The project aims to be a leading platform for interfaith scripture exploration and AI-assisted theological inquiry, offering deep insights and fostering understanding across diverse spiritual traditions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components for a modern, minimalist aesthetic.
- **Component Library**: Radix UI components via shadcn/ui.
- **Design Principles**: Emphasis on clear navigation, content readability, and an intuitive AI interaction experience. Minimalist interface with focus on content. Responsive design for various screen sizes.
- **Interactive Elements**: Clickable verse explanations with AI-generated content, dynamic chapter/page navigation, and visual cues for AI context switching.
- **AI Companion**: Religion-specific spiritual guide system with dedicated personas that activate only within their respective religious texts (Islamic Mufti for Quran, Christian Priest for Bible, Jewish Rabbi for Torah, Hindu Guru for Hindu texts, Buddhist Monk for Buddhist texts) and a voice-first interface (GrokStyleOrb).

### Technical Implementations
- **Frontend**:
    - **State Management**: TanStack Query for server state management.
    - **Routing**: Wouter for client-side routing.
    - **Build Tool**: Vite.
- **Backend**:
    - **Runtime**: Node.js with Express.js.
    - **Language**: TypeScript.
    - **Database ORM**: Drizzle ORM.
    - **Database**: PostgreSQL (Neon Database).
    - **Session Management**: PostgreSQL sessions with `connect-pg-simple`.
    - **AI Integration**: OpenAI GPT-4o for AI chat functionality.
    - **Text-to-Speech**: ElevenLabs integration with fallback to browser voices.

### Feature Specifications
- **Multi-Religious Scripture Library**: Supports Christianity (Bible), Islam (Quran + Hadith Collections), Judaism (Torah), Hinduism (Bhagavad Gita, Upanishads), and Buddhism (Tripitaka texts).
- **Hadith Integration**: Full integration of 6 major hadith collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah) under Islam category with authentic prophetic traditions from fawazahmed0/hadith-api.
- **Dynamic Navigation**: Chapter/Surah/Section-based navigation with verse counts across all religious texts.
- **AI Chatbot**: Contextual AI discussions with religious texts, featuring specialized Islamic Mufti and Hadith Scholar personas for Quranic and Hadith content respectively.
- **Voice-First Interface**: Browser speech recognition and ElevenLabs voice synthesis for AI interactions.
- **User Management**: Basic user authentication and session persistence.
- **Reading Progress**: Tracking of user reading progress across all religious traditions.
- **Religion-Specific Scholars**: Contextual activation of appropriate religious scholars (Christian Priest, Islamic Mufti, Hadith Scholar, Jewish Rabbi, Hindu Guru, Buddhist Monk) based on selected texts.

### System Design Choices
- **Data Flow**:
    - Scripture Loading: User selection guides content display.
    - AI Chat: User messages trigger contextual OpenAI API calls.
    - Reading Tracking: Chapter changes update database.
    - Session Management: Persistent chat sessions.
- **API Endpoints**:
    - `GET /api/religions`: Available religions (Christianity, Islam, Judaism, Hinduism, Buddhism) and their books.
    - `GET /api/religions/:religion/books`: Books for specific religion including hadith collections under Islam.
    - `GET /api/scriptures`: Scripture verses by religion/book/chapter with intelligent routing for Quran vs Hadith content.
    - `GET /api/verse/random`: Random verse selection across all religious texts including hadith.
    - `POST /api/chat`: AI chat with scripture context and appropriate scholar persona selection.
    - `POST /api/readings`: Track user reading progress.
- **Database Schema**: Users, Scriptures, Chat Messages, User Readings.

## Recent Changes

### October 2025 - Production-Ready Enhancements
- **Monorepo Foundation**: Established monorepo structure with pnpm workspaces and Turborepo for scalable development.
- **Package Ecosystem**: Created shared packages for config, types, UI, and AI adapters to promote code reuse.
- **Enhanced Database Schema**: Added GDPR consent tracking, metrics events, and voice session tables.
- **AI Adapter Layer**: Implemented XAI Grok-2 as primary AI provider with OpenAI GPT-4o fallback for reliability.
- **Multi-Faith Personas**: Expanded persona system to include Universal Sage, Islamic Mufti, Hadith Scholar, Christian Priest, Jewish Rabbi, Hindu Guru, and Buddhist Monk.
- **Security P0**: Implemented helmet with strict CSP, comprehensive rate limiting, input sanitization, and structured logging.
- **GDPR Compliance**: Added consent management, data export/delete capabilities, and comprehensive privacy documentation.
- **Export Scripts**: Created automated scripts for ZIP distribution and Postman API collection generation.
- **Comprehensive Documentation**: Added ARCHITECTURE.md, SECURITY_P0.md, GDPR_COMPLIANCE.md, and API_REFERENCE.md.

### August 2025
- **Religion Reorganization**: Restructured from individual text categories (bible, quran, hadith, etc.) to proper religious groupings (Christianity, Islam, Judaism, Hinduism, Buddhism).
- **Hadith Integration Under Islam**: Moved all 6 hadith collections from separate category to appear under Islam alongside Quran surahs for better discoverability.
- **Smart Scholar Selection**: Enhanced persona system to automatically choose between Islamic Mufti (for Quran) and Hadith Scholar (for Hadith collections) when studying Islamic texts.
- **Unified Islamic Experience**: Users can now access both primary Islamic texts (Quran) and prophetic traditions (Hadith) from a single "Islam" selection in the interface.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection.
- **drizzle-orm**: Type-safe database ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/react-***: Headless UI components.
- **openai**: Official OpenAI API client (with XAI Grok-2 integration).
- **express**: Web server framework.
- **helmet**: Security headers and CSP.
- **rate-limiter-flexible**: Rate limiting protection.
- **pino**: Structured logging with secret redaction.
- **xss**: Input sanitization.
- **ElevenLabs**: Text-to-speech API.
- **bible-api.com**: External API for Bible content.
- **alquran.cloud**: External API for Quran content.
- **sefaria.org**: External API for Torah content.

### Development Dependencies
- **vite**: Build tool and development server.
- **typescript**: Type checking and compilation.
- **tailwindcss**: Utility-first CSS framework.
- **tsx**: TypeScript execution for development.
- **turbo**: Monorepo build system.
- **archiver**: ZIP export generation.

## Project Structure

### Monorepo Layout
```
rellio-hybrid/
├── packages/
│   ├── config/          # Shared TypeScript & ESLint configs
│   ├── types/           # Shared Zod schemas & database types
│   ├── ai/              # AI adapters & persona system
│   └── ui/              # Theme tokens & utility functions
├── client/              # React frontend application
├── server/              # Express backend API
│   ├── middleware/      # Security, logging, rate limiting
│   ├── services/        # AI, scripture, voice services
│   └── websockets/      # Voice WebSocket handler
├── shared/              # Shared schemas (being migrated to packages/types)
├── scripts/             # Build utilities & export scripts
├── docs/                # Comprehensive documentation
└── dist/                # Build artifacts & exports
```

## Documentation

See the `docs/` directory for comprehensive documentation:

- **ARCHITECTURE.md**: System architecture and tech stack details
- **SECURITY_P0.md**: Security measures and best practices
- **GDPR_COMPLIANCE.md**: Privacy and data protection compliance
- **API_REFERENCE.md**: Complete API endpoint documentation

## Export Scripts

### ZIP Distribution
```bash
npm run export-zip
```
Creates `dist/rellio-starter.zip` with the entire codebase (excluding node_modules and .env files).

### Postman Collection
```bash
npm run export-postman
```
Generates `postman_collection.json` with all API endpoints for testing and documentation.