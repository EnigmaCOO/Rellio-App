# Scripture Dashboard Application

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