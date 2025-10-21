# Rellio API Reference

## Base URL

**Development**: `http://localhost:5000`  
**Production**: `https://your-domain.com`

## Authentication

Most endpoints require session-based authentication. After login, the session cookie is automatically included in subsequent requests.

### Session Cookie

- Name: `connect.sid`
- HttpOnly: true
- Secure: true (production)
- SameSite: strict
- Max-Age: 24 hours

## Rate Limiting

All API endpoints are rate-limited. Exceeding limits returns `429 Too Many Requests`:

```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 30
}
```

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 req/min |
| Authentication | 5 req/5min |
| AI Chat | 20 req/min |
| Voice WebSocket | 30 conn/min |

## Response Format

### Success Response

```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "error": "Error message",
  "details": { ... } // Optional
}
```

## Endpoints

---

## Health & Status

### Health Check

```http
GET /health
```

Check if the server is running.

**Response**

```json
{
  "status": "ok",
  "timestamp": "2025-10-21T14:30:00.000Z"
}
```

---

## Authentication

### Sign Up

```http
POST /api/auth/signup
```

Create a new user account.

**Request Body**

```json
{
  "email": "user@example.com",
  "username": "testuser",
  "password": "password123",
  "firstName": "Test",
  "lastName": "User"
}
```

**Response**

```json
{
  "user": {
    "id": "uuid",
    "username": "testuser",
    "email": "user@example.com"
  },
  "message": "Account created successfully"
}
```

**Errors**

- `400`: Validation error
- `409`: Email or username already exists

---

### Login

```http
POST /api/auth/login
```

Authenticate and create session.

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Or with username:

```json
{
  "username": "testuser",
  "password": "password123"
}
```

**Response**

```json
{
  "user": {
    "id": "uuid",
    "username": "testuser",
    "email": "user@example.com"
  },
  "message": "Login successful"
}
```

**Errors**

- `400`: Missing credentials
- `401`: Invalid credentials
- `429`: Too many login attempts

---

### Logout

```http
POST /api/auth/logout
```

End current session.

**Response**

```json
{
  "message": "Logged out successfully"
}
```

---

## Scripture

### Get Religions

```http
GET /api/religions
```

List all available religions.

**Response**

```json
{
  "religions": [
    {
      "id": "christianity",
      "name": "Christianity",
      "books": ["Bible"]
    },
    {
      "id": "islam",
      "name": "Islam",
      "books": ["Quran", "Hadith Collections"]
    },
    {
      "id": "judaism",
      "name": "Judaism",
      "books": ["Torah"]
    },
    {
      "id": "hinduism",
      "name": "Hinduism",
      "books": ["Bhagavad Gita", "Upanishads"]
    },
    {
      "id": "buddhism",
      "name": "Buddhism",
      "books": ["Tripitaka"]
    }
  ]
}
```

---

### Get Books by Religion

```http
GET /api/religions/:religion/books
```

Get all books for a specific religion.

**Parameters**

- `religion` (path): Religion ID (christianity, islam, judaism, hinduism, buddhism)

**Response**

```json
{
  "religion": "islam",
  "books": [
    {
      "id": "quran",
      "name": "Quran",
      "chapters": 114
    },
    {
      "id": "sahih_bukhari",
      "name": "Sahih Bukhari",
      "books": 97
    }
  ]
}
```

---

### Get Scripture Verses

```http
GET /api/scriptures
```

Get verses from a specific chapter.

**Query Parameters**

- `religion` (required): Religion ID
- `book` (required): Book name
- `chapter` (required): Chapter number

**Example**

```http
GET /api/scriptures?religion=islam&book=quran&chapter=1
```

**Response**

```json
{
  "religion": "islam",
  "book": "quran",
  "chapter": 1,
  "name": "Al-Fatiha (The Opening)",
  "verses": [
    {
      "verse": 1,
      "text": "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
      "translation": "english"
    },
    {
      "verse": 2,
      "text": "All praise is due to Allah, Lord of the worlds.",
      "translation": "english"
    }
    // ... more verses
  ]
}
```

---

### Get Random Verse

```http
GET /api/verse/random
```

Get a random verse from any scripture.

**Query Parameters**

- `religion` (optional): Filter by religion

**Response**

```json
{
  "verse": {
    "religion": "christianity",
    "book": "Bible",
    "chapter": 3,
    "verse": 16,
    "text": "For God so loved the world...",
    "reference": "John 3:16"
  }
}
```

---

## AI Chat

### Send Chat Message

```http
POST /api/chat
```

Send a message to an AI spiritual guide.

**Request Body**

```json
{
  "message": "What is the meaning of Al-Fatiha?",
  "sessionId": "session-uuid",
  "context": {
    "religion": "islam",
    "book": "quran",
    "chapter": 1,
    "persona": "islamic_mufti"
  }
}
```

**Fields**

- `message` (required): User's question or message
- `sessionId` (required): Conversation session ID (generate with UUID)
- `context` (optional): Scripture context and persona selection
  - `religion`: Current religion being studied
  - `book`: Current book
  - `chapter`: Current chapter
  - `persona`: Specific persona to use (auto-selected if not provided)

**Personas**

- `universal_sage`: Cross-tradition wisdom
- `islamic_mufti`: Quran & Islamic jurisprudence
- `hadith_scholar`: Prophetic traditions
- `christian_priest`: Biblical guidance
- `jewish_rabbi`: Torah & Talmud
- `hindu_guru`: Vedic wisdom
- `buddhist_monk`: Dharma teachings

**Response**

```json
{
  "response": "Al-Fatiha, meaning 'The Opening', is the first chapter...",
  "persona": "islamic_mufti",
  "provider": "grok",
  "latency": 1523,
  "messageId": 123
}
```

**Errors**

- `400`: Invalid message or missing sessionId
- `429`: Too many AI requests

---

### Compare Across Religions

```http
POST /api/compare
```

Compare teachings on a theme across multiple religions.

**Request Body**

```json
{
  "theme": "compassion",
  "sessionId": "session-uuid",
  "maxVersesPerReligion": 3
}
```

**Response**

```json
{
  "theme": "compassion",
  "verses": {
    "christianity": [
      {
        "reference": "Matthew 9:36",
        "text": "When he saw the crowds, he had compassion on them...",
        "relevance": "high"
      }
    ],
    "islam": [
      {
        "reference": "Quran 21:107",
        "text": "We sent you as a mercy to all the worlds.",
        "relevance": "high"
      }
    ],
    "buddhism": [
      {
        "reference": "Metta Sutta",
        "text": "May all beings be happy...",
        "relevance": "high"
      }
    ]
  },
  "analysis": "Across all traditions, compassion is central..."
}
```

---

## Reading Progress

### Track Reading

```http
POST /api/readings
```

Record that a user read a chapter.

**Request Body**

```json
{
  "religion": "islam",
  "book": "quran",
  "chapter": 1
}
```

**Response**

```json
{
  "message": "Reading recorded",
  "readingId": 42
}
```

---

### Start Reading Session

```http
POST /api/progress/session/start
```

Begin a new reading session.

**Request Body**

```json
{
  "religion": "islam",
  "book": "quran",
  "chapter": 1
}
```

**Response**

```json
{
  "sessionId": 123,
  "startTime": "2025-10-21T14:30:00.000Z"
}
```

---

### Update Reading Session

```http
PUT /api/progress/session/:sessionId
```

Update an active reading session.

**Request Body**

```json
{
  "endTime": "2025-10-21T15:00:00.000Z",
  "durationMinutes": 30,
  "versesRead": 7,
  "completedChapter": true,
  "mood": "peaceful",
  "notes": "Beautiful reflections on gratitude"
}
```

**Response**

```json
{
  "message": "Session updated",
  "session": {
    "id": 123,
    "durationMinutes": 30,
    "versesRead": 7
  }
}
```

---

## GDPR & Privacy

### Submit Consent

```http
POST /api/gdpr/consent
```

Record user's GDPR consent.

**Request Body**

```json
{
  "region": "EU",
  "accepted": true,
  "version": "1.0"
}
```

**Response**

```json
{
  "message": "Consent recorded",
  "consentId": 456
}
```

---

### Get Consent Status

```http
GET /api/gdpr/consent
```

Retrieve user's consent record.

**Response**

```json
{
  "consent": {
    "region": "EU",
    "accepted": true,
    "version": "1.0",
    "createdAt": "2025-10-21T14:00:00.000Z"
  }
}
```

---

### Export User Data

```http
GET /api/gdpr/export
```

Export all user data (GDPR right to access).

**Query Parameters**

- `format` (optional): `json` (default), `csv`, or `pdf`

**Response**

```json
{
  "export": {
    "user": { ... },
    "readings": [ ... ],
    "chatMessages": [ ... ],
    "sessions": [ ... ],
    "consents": [ ... ]
  },
  "generatedAt": "2025-10-21T14:30:00.000Z"
}
```

---

### Delete User Data

```http
DELETE /api/gdpr/delete
```

Request deletion of all user data (GDPR right to erasure).

**Response**

```json
{
  "message": "Deletion request submitted",
  "deletionDate": "2025-10-28T14:30:00.000Z",
  "gracePeriod": "7 days"
}
```

---

## Metrics & Analytics

### Track Event

```http
POST /api/metrics/track
```

Track a user interaction event.

**Request Body**

```json
{
  "eventType": "voice_interrupt",
  "eventData": {
    "sessionId": "voice-session-uuid",
    "timestamp": "2025-10-21T14:30:00.000Z"
  }
}
```

**Event Types**

- `voice_interrupt`: Voice playback interrupted
- `tts_play_start`: Text-to-speech started
- `tts_play_end`: Text-to-speech completed
- `compare_used`: Cross-religion comparison used
- `consent_accept`: User accepted consent
- `chapter_completed`: User finished a chapter

**Response**

```json
{
  "message": "Event tracked",
  "eventId": 789
}
```

---

## WebSocket - Voice

### Connect

```
ws://localhost:5000/ws/voice
```

Or with WSS:

```
wss://your-domain.com/ws/voice
```

### Authentication

Session cookie must be present.

### Message Format

All messages are JSON:

```json
{
  "type": "message_type",
  "data": { ... }
}
```

### Client → Server Messages

#### Start Voice Session

```json
{
  "type": "start",
  "data": {
    "persona": "islamic_mufti",
    "context": {
      "religion": "islam",
      "book": "quran",
      "chapter": 1
    }
  }
}
```

#### Stop Voice Session

```json
{
  "type": "stop"
}
```

#### Interrupt Playback

```json
{
  "type": "interrupt",
  "data": {
    "reason": "user_spoke"
  }
}
```

#### Heartbeat

```json
{
  "type": "heartbeat"
}
```

Send every 30 seconds to keep connection alive.

### Server → Client Messages

#### Voice Started

```json
{
  "type": "voice_started",
  "data": {
    "sessionId": "voice-uuid",
    "persona": "islamic_mufti"
  }
}
```

#### Audio Chunk

```json
{
  "type": "audio_chunk",
  "data": {
    "chunk": "base64-encoded-audio-data",
    "format": "mp3"
  }
}
```

#### Voice Ended

```json
{
  "type": "voice_ended",
  "data": {
    "duration": 5.2,
    "interrupted": false
  }
}
```

#### Error

```json
{
  "type": "error",
  "data": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Connection Lifecycle

1. **Connect**: Client establishes WebSocket connection
2. **Authenticate**: Session cookie verified
3. **Ready**: Server sends ready message
4. **Active**: Exchange voice messages
5. **Heartbeat**: Client sends heartbeat every 30s
6. **Close**: Either party can close connection

### Error Codes

- `AUTH_REQUIRED`: Session cookie missing or invalid
- `RATE_LIMIT`: Too many connections
- `INVALID_MESSAGE`: Malformed message
- `SERVICE_ERROR`: Internal server error

---

## Error Codes

### HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Custom Error Codes

Application-specific errors in response body:

- `VALIDATION_ERROR`: Request validation failed
- `AUTH_FAILED`: Authentication failed
- `PERMISSION_DENIED`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `DUPLICATE_ENTRY`: Resource already exists
- `AI_SERVICE_ERROR`: AI provider error
- `VOICE_SERVICE_ERROR`: Voice service error

---

## Postman Collection

Import the Postman collection for easy API testing:

```bash
npm run export-postman
```

This generates `postman_collection.json` with all endpoints pre-configured.

---

**API Version**: 1.0.0  
**Last Updated**: October 2025
