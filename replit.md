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

Changelog:
- July 05, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.