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
- **AI Companion**: Grok-inspired scholar persona system with customizable AI companions and a voice-first interface (GrokStyleOrb).

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
- **Multi-Religious Scripture Library**: Supports Bible, Quran, Torah, Bhagavad Gita, and Tripitaka.
- **Dynamic Navigation**: Chapter/Surah/Page-based navigation with verse counts.
- **AI Chatbot**: Contextual AI discussions with religious texts, multi-religious perspective generation, intelligent question classification, smart bookmarking of AI responses, and chat history management.
- **Voice-First Interface**: Browser speech recognition and ElevenLabs voice synthesis for AI interactions.
- **User Management**: Basic user authentication and session persistence.
- **Reading Progress**: Tracking of user reading progress.
- **Customization**: Customizable AI personas.

### System Design Choices
- **Data Flow**:
    - Scripture Loading: User selection guides content display.
    - AI Chat: User messages trigger contextual OpenAI API calls.
    - Reading Tracking: Chapter changes update database.
    - Session Management: Persistent chat sessions.
- **API Endpoints**:
    - `GET /api/religions`: Available religions and their books.
    - `GET /api/religions/:religion/books`: Books for specific religion.
    - `GET /api/scriptures`: Scripture verses by religion/book/chapter.
    - `POST /api/chat`: AI chat with scripture context.
    - `POST /api/readings`: Track user reading progress.
- **Database Schema**: Users, Scriptures, Chat Messages, User Readings.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection.
- **drizzle-orm**: Type-safe database ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/react-***: Headless UI components.
- **openai**: Official OpenAI API client.
- **express**: Web server framework.
- **ElevenLabs**: Text-to-speech API.
- **bible-api.com**: External API for Bible content.
- **alquran.cloud**: External API for Quran content.
- **sefaria.org**: External API for Torah content.

### Development Dependencies
- **vite**: Build tool and development server.
- **typescript**: Type checking and compilation.
- **tailwindcss**: Utility-first CSS framework.
- **tsx**: TypeScript execution for development.