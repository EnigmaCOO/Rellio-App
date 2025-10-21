# Rellio Architecture Documentation

## Overview

Rellio is a production-ready, full-stack spiritual sanctuary platform that combines multi-faith scripture study, AI-powered guidance, voice interaction, and immersive experiences. The architecture is designed for scalability, security, and maintainability.

## System Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3 + shadcn/ui components
- **State Management**: 
  - TanStack Query v5 for server state
  - Zustand for client state
- **Routing**: Wouter (lightweight client-side router)
- **Animation**: Framer Motion
- **3D Graphics** (planned): React Three Fiber + Three.js

#### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 4
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Session**: PostgreSQL sessions via connect-pg-simple
- **WebSocket**: ws library for real-time voice

#### AI & Voice
- **Primary AI**: XAI Grok-2 with OpenAI GPT-4o fallback
- **Personas**: Multi-faith spiritual guides (7 personas)
- **TTS**: ElevenLabs with browser fallback
- **STT**: Web Speech API

#### Security
- **Headers**: Helmet with strict CSP
- **Rate Limiting**: rate-limiter-flexible (in-memory)
- **Input Sanitization**: XSS protection
- **Logging**: Pino with redaction
- **Authentication**: Session-based with JWT tokens

### Monorepo Structure

```
rellio-hybrid/
├── packages/
│   ├── config/          # Shared TypeScript & ESLint configs
│   ├── types/           # Shared Zod schemas & types
│   ├── ai/              # AI adapters & persona system
│   └── ui/              # Theme tokens & utilities
├── client/              # React frontend application
├── server/              # Express backend API
├── shared/              # Legacy shared schemas (being migrated)
├── scripts/             # Build & export utilities
├── docs/                # Documentation
└── dist/                # Build artifacts & exports
```

### Database Schema

#### Core Tables

**users**
- Authentication and profile data
- Social provider integration
- Notification preferences
- Moderation status

**scriptures**
- Multi-faith scripture storage
- Verses with translations
- Indexed by religion/book/chapter/verse

**chatMessages**
- AI conversation history
- Context and references
- Voice and interruption data

**spiritualJourneys**
- User progress tracking
- Reading streaks and goals
- Favorite religions

**readingSessions**
- Detailed session tracking
- Time spent, verses read
- Mood and notes

#### GDPR & Compliance

**gdprConsents**
- User consent records
- Region-specific tracking
- Version management

**metricsEvents**
- User interaction tracking
- Voice interruptions
- Feature usage

**voiceSessions**
- Voice interaction tracking
- Interruption counts
- Provider metrics

#### Moderation

**flaggedMessages**
- Content moderation
- AI confidence scores
- Review status

**moderationLogs**
- Audit trail
- Actions and decisions

## API Architecture

### RESTful Endpoints

#### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Session termination

#### Scripture
- `GET /api/religions` - List available religions
- `GET /api/religions/:religion/books` - Books by religion
- `GET /api/scriptures` - Get verses by religion/book/chapter
- `GET /api/verse/random` - Random verse

#### AI Chat
- `POST /api/chat` - Send message to AI persona
- `POST /api/compare` - Cross-religious comparison

#### Progress
- `POST /api/readings` - Track reading
- `POST /api/progress/session/start` - Start session
- `PUT /api/progress/session/:id` - Update session

#### GDPR
- `POST /api/gdpr/consent` - Submit consent
- `GET /api/gdpr/consent` - Get consent status
- `DELETE /api/gdpr/data` - Request data deletion

#### Metrics
- `POST /api/metrics/track` - Track events

### WebSocket

**Voice Endpoint**: `/ws/voice`

Message Types:
- `start` - Begin voice interaction
- `stop` - End interaction
- `interrupt` - Cancel current playback
- `heartbeat` - Keep connection alive

## AI Persona System

### Personas

1. **Universal Sage** - Cross-tradition wisdom
2. **Islamic Mufti** - Quran & Islamic jurisprudence
3. **Hadith Scholar** - Prophetic traditions
4. **Christian Priest** - Biblical guidance
5. **Jewish Rabbi** - Torah & Talmud
6. **Hindu Guru** - Vedic wisdom
7. **Buddhist Monk** - Dharma teachings

### Context-Aware Selection

Personas are automatically selected based on:
- Current scripture being read
- User preferences
- Conversation context

### Adapter Pattern

The AI adapter provides:
- Primary provider (Grok-2)
- Fallback provider (GPT-4o)
- Graceful degradation
- Error handling

## Security Architecture

### Defense in Depth

1. **Network Layer**
   - Helmet headers (HSTS, X-Frame-Options)
   - Strict CSP
   - CORS allowlist

2. **Application Layer**
   - Rate limiting per route
   - Input sanitization
   - Output encoding
   - SQL injection prevention (Drizzle ORM)

3. **Data Layer**
   - Encrypted passwords (bcrypt)
   - Session tokens (secure, httpOnly)
   - Redacted logging

### Rate Limiting Strategy

- General: 100 req/min
- Auth: 5 req/5min
- AI: 20 req/min
- Voice: 30 req/min

## Scalability Considerations

### Current State
- In-memory sessions (MemoryStore)
- In-memory rate limiting
- Single-instance deployment

### Future Enhancements
- Redis for sessions and rate limiting
- Horizontal scaling with load balancer
- Database connection pooling
- CDN for static assets
- BullMQ for background jobs

## Tech Debt

### Priority 1 (Security/Stability)
- [ ] JWT token rotation mechanism
- [ ] Redis-backed rate limiting for cluster support
- [ ] Enhanced CSP with nonce-based script loading

### Priority 2 (Features)
- [ ] Complete 3D visualization with Three.js
- [ ] AR/VR scaffold implementation
- [ ] PWA with service worker and offline support
- [ ] Comprehensive test coverage

### Priority 3 (Performance)
- [ ] API response caching
- [ ] Scripture data pre-fetching
- [ ] Bundle size optimization
- [ ] Image optimization and lazy loading

## Development Workflow

### Local Development
```bash
npm run dev          # Start both frontend and backend
npm run db:push      # Sync database schema
npm run check        # TypeScript type checking
```

### Building
```bash
npm run build        # Build for production
```

### Exporting
```bash
npm run export-zip       # Create distributable ZIP
npm run export-postman   # Generate Postman collection
```

## Deployment

### Environment Variables

See `.env.example` for complete list.

Critical variables:
- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - Session encryption key
- `XAI_API_KEY` - Grok AI access
- `OPENAI_API_KEY` - OpenAI fallback
- `ELEVENLABS_API_KEY` - Voice synthesis

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure session secrets
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure error monitoring (Sentry)
- [ ] Enable analytics (PostHog)
- [ ] Review CSP policies
- [ ] Test rate limiting
- [ ] Verify GDPR compliance
- [ ] Load test critical endpoints

## Monitoring & Observability

### Logging
- Structured logging with Pino
- Automatic secret redaction
- Request/response logging
- Error tracking

### Metrics (Planned)
- Server events via metricsEvents table
- User engagement analytics
- Voice interaction quality
- AI response latency

### Error Tracking (Planned)
- Sentry integration for errors
- Source maps for debugging
- User context attachment

## Support & Maintenance

### Regular Tasks
- Weekly dependency updates
- Monthly security audits
- Quarterly performance reviews
- Database optimization

### Backup Strategy
- Daily automated database backups
- 30-day retention policy
- Point-in-time recovery capability

---

**Last Updated**: October 2025
**Version**: 1.0.0
