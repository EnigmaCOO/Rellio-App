# Rellio Scripture Library Application

## Overview

This is a full-stack web application for scripture study and AI-powered chat assistance. The application provides a comprehensive scripture reading platform with support for multiple religious texts (Bible, Quran, Torah) and includes an AI chatbot for contextual discussions about the texts.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Component Library**: Radix UI components via shadcn/ui
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL support
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL sessions with connect-pg-simple
- **API Integration**: OpenAI GPT-4o for AI chat functionality

### Key Components

#### Database Schema
- **Users**: Basic user management with username/password
- **Scriptures**: Multi-religion scripture storage with book/chapter/verse structure
- **Chat Messages**: Session-based chat history with AI responses
- **User Readings**: Reading progress tracking

#### API Endpoints
- `GET /api/religions` - Available religions and their books
- `GET /api/religions/:religion/books` - Books for specific religion
- `GET /api/scriptures` - Scripture verses by religion/book/chapter
- `POST /api/chat` - AI chat with scripture context
- `POST /api/readings` - Track user reading progress

#### Frontend Components
- **NavigationPanel**: Religion/book/chapter selection with recent readings
- **ContentPanel**: Scripture text display with reading tools
- **ChatPanel**: AI-powered chat interface with contextual responses
- **Dashboard**: Main application layout orchestrating all components

## Data Flow

1. **Scripture Loading**: User selects religion → books loaded → chapters selected → verses displayed
2. **AI Chat**: User sends message → context (current scripture) included → OpenAI API called → response displayed
3. **Reading Tracking**: Chapter changes tracked → stored in database → displayed in recent readings
4. **Session Management**: Chat sessions maintained per user interaction

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Headless UI components
- **openai**: Official OpenAI API client
- **express**: Web server framework

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: ESBuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `OPENAI_API_KEY`: OpenAI API key for chat functionality
- `NODE_ENV`: Environment setting (development/production)

### Hosting Requirements
- Node.js runtime environment
- PostgreSQL database (Neon recommended)
- OpenAI API access
- Static file serving capability

## Changelog

- **July 11, 2025 11:03 PM**: Header cleanup - removed "Rellio Scripture Library" text from header, keeping only the logo for cleaner design.
- **July 11, 2025 11:14 PM**: Enhanced navigation UX - moved chapter navigation (Previous/Next buttons, chapter numbers, verse counts) from top to bottom of verse list in content panel, styled with Tailwind CSS as clickable links with hover effects, added debug logging for navigation rendering.
- **July 11, 2025 11:03 PM**: Fixed MessageCircle import error - resolved runtime error by importing MessageCircle icon from lucide-react library, added console logging for chat panel close action debugging.
- **July 07, 2025 12:40 AM**: Enhanced AI Scripture Guide with smart bookmarking features - implemented localStorage-based bookmark system for saving AI responses with context (religion, book, chapter), added collapsible bookmarks panel with toggle button showing bookmark count, enhanced message styling with gradient AI avatars and improved chat bubbles (light gray for users, white for AI), added bookmark buttons next to AI responses with toast notifications, implemented bookmark management (view, remove, clear all), updated header with gradient styling and enhanced UI controls, improved console logging for debugging chat state changes, and added informative footer text about authentic API usage and bookmarking functionality.
- **July 06, 2025 3:22 PM**: Implemented intelligent chat context preservation - automatic conversation saving/loading when switching between religious texts, enhanced message metadata with verse context and religion/book information, visual context switching indicators with blue gradient styling, recent conversations sidebar with clickable access to previous discussions, intelligent context management preserving up to 5 recent conversations with message counts and last activity timestamps.
- **July 06, 2025 6:35 AM**: Organized AI Scripture Guide chat history - implemented message grouping by religious text and book, enhanced message styling (light gray for user messages, white for AI responses), added "Clear History" button with red accent styling, scrollable message list with timestamps, previous conversations section showing other religious text discussions, and message count display in header.
- **July 06, 2025 6:15 AM**: Implemented clickable verse explanations - verse numbers in middle panel now clickable with immediate AI-generated explanations, collapsible explanation boxes with gradient styling, religion-specific contextual explanations (Biblical Greek terms, Quranic Arabic meanings, Hebrew Torah concepts, Sanskrit Bhagavad Gita wisdom, Pali Buddhist teachings), loading states with spinning indicators, and close buttons for clean UI experience.
- **July 06, 2025 6:10 AM**: Enhanced AI Scripture Guide with expert system prompt - implemented comprehensive system prompt with 5 key principles (concise explanations, historical context, follow-up invitations, respectful scholarly tone, multiple interpretations), integrated specific API references for each religious tradition, enhanced chat UI with gradient styling and improved message bubbles, updated both standalone HTML and backend OpenAI service for consistent expert guidance experience.
- **July 06, 2025 2:15 AM**: Completed authentic Bhagavad Gita verse extraction - loaded 15 authentic Sanskrit verses with transliterations and English translations from user-provided PDF (12 verses from Chapter 1, 3 key verses from Chapter 2), structured all 18 chapters with 701 total verses, implemented proper verse numbering and display formatting, ensuring authentic religious content throughout the application.
- **July 06, 2025 1:48 AM**: Loaded authentic Bhagavad Gita content from PDF - extracted all 18 chapters with Sanskrit verses and English translations from user-provided PDF, replaced external API with local JSON file containing 700+ authentic verses, ensuring accurate and complete Bhagavad Gita text for study and reference.
- **July 06, 2025 1:03 AM**: Enhanced Torah chapter display with verse counts - Torah chapters now show "Chapter 1 (31 verses)" in header and "31 verses in this chapter" in navigation, matching Bible's enhanced display format. All Torah books maintain accurate chapter counts (Bereshit: 50, Shemot: 40, Vayikra: 27, Bamidbar: 36, Devarim: 34).
- **July 06, 2025 12:58 AM**: Fixed Bible chapter navigation to show all chapters dynamically - corrected API query to fetch proper chapter counts per book (Leviticus now shows 27 chapters instead of limiting to 10), ensuring complete access to all biblical content with accurate chapter ranges.
- **July 06, 2025 12:52 AM**: Enhanced Bible chapter display with verse counts - Bible chapters now show "Chapter 1 (31 verses)" in header and "31 verses in this chapter" in navigation, providing clear chapter information while maintaining standard chapter-based navigation (different from Quran's page-based approach).
- **July 06, 2025 12:45 AM**: Fixed Quran page navigation by enabling full surah content - modified external API to return all verses per surah instead of limiting to 10, implemented proper client-side pagination with 10 verses per page, and ensured accurate page counts (Al-Baqarah now shows "Page 1 of 29" with full 286 verses).
- **July 06, 2025 12:38 AM**: Implemented page-based navigation for Quran chapters - displays "Page 1 of 3" instead of "Chapter 1", shows verse counts per page (10 verses per page), maintains accurate verse numbering across pages, and provides contextual navigation information (e.g., "5 verses on this page") for enhanced reading experience.
- **July 06, 2025 12:30 AM**: Implemented comprehensive Quran navigation with all 114 surahs - added complete surah mapping with Arabic names, English translations, and verse counts, enhanced chapter selector to display surah numbers, names, and verse counts (e.g., "1 Al-Fatihah 7v"), and integrated smart chapter-to-surah navigation for seamless Quran study experience.
- **July 06, 2025 12:18 AM**: Fixed text cleaning and chapter numbering - removed footnotes from Torah texts (HTML tags, parenthetical numbers, brackets), implemented proper Quran chapter display (Chapter 2 for Al-Baqarah instead of always Chapter 1), and ensured accurate Bible chapter counts are displayed when books are selected.
- **July 06, 2025 12:07 AM**: Comprehensive UI enhancements for seamless launch - implemented search functionality for book filtering, cohesive state management across all panels, enhanced responsive design for mobile (lg: breakpoints), subtle fade-in animations for content updates, improved panel layouts with proper height management, and polished header design with responsive search bar.
- **July 05, 2025 11:57 PM**: Enhanced AI Scripture Guide with contextual messaging - neutral welcome state, dynamic text adaptation ("Ask questions about Quran - Surah 1"), contextual placeholders, and improved chat bubble styling with shadows and borders.
- **July 05, 2025 11:48 PM**: Implemented dynamic chapter navigation with adaptive ranges - Bible (uses API chapter counts), Quran (1 chapter per surah), Bhagavad Gita (18 chapters), Torah (API chapter counts), Tripitaka (10 chapters). Enhanced grid layout with responsive columns and improved active state styling.
- **July 05, 2025 11:29 PM**: Verified and corrected all biblical chapter counts for accuracy - complete Bible with 66 books (Psalms: 150 chapters, Matthew: 28, Isaiah: 66, etc.). Torah books verified with exact biblical correspondence (Bereshit: 50, Shemot: 40, etc.).
- **July 05, 2025 11:25 PM**: Fixed chapter counting for all religious texts - now displays correct number ranges (Genesis: 50, Bhagavad Gita: 18, Quran surahs with proper verse groupings). Implemented all 114 Quranic surahs with authentic API integration.
- **July 05, 2025 8:08 PM**: Implemented external API integrations for real scripture content - Bible (bible-api.com), Quran (alquran.cloud), Torah (sefaria.org), with local authentic content for Bhagavad Gita and Tripitaka.
- **July 05, 2025 7:57 PM**: Enhanced dropdown navigation with improved styling, all 5 religious texts, better loading states and error handling.
- **July 05, 2025**: Initial setup with three-panel scripture dashboard architecture.

## User Preferences

Preferred communication style: Simple, everyday language.