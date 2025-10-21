# Rellio Security P0 Documentation

## Security Priority 0 (P0) Requirements

This document outlines the critical security measures implemented in Rellio to protect user data, prevent attacks, and ensure compliance with security best practices.

## 1. HTTP Security Headers

### Helmet Configuration

Rellio uses Helmet middleware to set secure HTTP headers:

```typescript
// Implemented in: server/middleware/security.ts
```

#### Headers Applied

**Strict-Transport-Security (HSTS)**
- `max-age`: 31,536,000 seconds (1 year)
- `includeSubDomains`: true
- `preload`: true
- Forces HTTPS connections

**X-Frame-Options**
- Action: `DENY`
- Prevents clickjacking attacks

**X-Content-Type-Options**
- Value: `nosniff`
- Prevents MIME type sniffing

**X-XSS-Protection**
- Enabled legacy XSS protection
- Complements CSP

**Referrer-Policy**
- Policy: `strict-origin-when-cross-origin`
- Limits referrer information leakage

## 2. Content Security Policy (CSP)

### Development Mode

Allows `unsafe-inline` and `unsafe-eval` for Vite HMR:

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' https://fonts.googleapis.com
```

### Production Mode

Strict policy without inline scripts:

```
default-src 'self'
script-src 'self'
style-src 'self' https://fonts.googleapis.com
connect-src 'self' https://api.openai.com https://api.x.ai https://api.elevenlabs.io wss: ws:
img-src 'self' data: https: blob:
media-src 'self' blob: data:
object-src 'none'
frame-src 'none'
base-uri 'self'
form-action 'self'
```

### CSP Violation Reporting

Currently: No violation reporting endpoint
Planned: CSP violation reporting to security monitoring

## 3. Rate Limiting

### Strategy

Token bucket algorithm via `rate-limiter-flexible`:

#### General API
- **Limit**: 100 requests per 60 seconds
- **Applied to**: All `/api/*` routes

#### Authentication Endpoints
- **Limit**: 5 requests per 300 seconds (5 minutes)
- **Applied to**: Login, signup, password reset

#### AI Chat
- **Limit**: 20 requests per 60 seconds
- **Applied to**: `/api/chat`, `/api/compare`

#### Voice WebSocket
- **Limit**: 30 connections per 60 seconds
- **Applied to**: `/ws/voice`

### Implementation

```typescript
// In-memory rate limiting (current)
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

// Future: Redis-backed for cluster support
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 100,
  duration: 60,
});
```

### Response

When limit exceeded:
- HTTP Status: `429 Too Many Requests`
- Header: `Retry-After` with seconds to wait
- Body: JSON with error message and retry time

## 4. Input Validation & Sanitization

### Zod Schema Validation

All API endpoints validate requests using Zod schemas:

```typescript
import { chatRequestSchema } from '@shared/schema';

// Validate before processing
const result = chatRequestSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}
```

### XSS Prevention

Automatic sanitization of all string inputs:

```typescript
// Applied globally to req.body and req.query
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    });
  }
  // Recursively sanitize arrays and objects
}
```

**Protection**:
- Strips all HTML tags by default
- Removes `<script>` tags
- Neutralizes JavaScript event handlers
- Preserves non-string data (numbers, booleans, objects)

### SQL Injection Prevention

**Drizzle ORM** provides automatic query parameterization:

```typescript
// SAFE - Parameterized query
await db.select().from(users).where(eq(users.email, email));

// NEVER use raw SQL with user input
```

## 5. Authentication & Session Security

### Session Management

- **Storage**: PostgreSQL via `connect-pg-simple`
- **Secret**: Environment variable `SESSION_SECRET`
- **Cookie Settings**:
  - `httpOnly`: true (prevents JavaScript access)
  - `secure`: true in production (HTTPS only)
  - `sameSite`: 'strict'
  - `maxAge`: 24 hours

### Password Security

- **Hashing**: bcrypt with work factor 10
- **Storage**: Never logged or transmitted in plain text
- **Validation**: Minimum 6 characters (should be increased to 12+)

### JWT Tokens (Planned)

Future implementation:
- Short-lived access tokens (15 minutes)
- Refresh tokens with rotation
- Token revocation on logout
- Secure storage in httpOnly cookies

## 6. Logging & Monitoring

### Pino Logger

Structured logging with automatic secret redaction:

```typescript
const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
});
```

### What Gets Logged

✅ **Logged**:
- Request method, path, status
- Response time
- Error messages and stack traces
- User IDs (not PII)

❌ **NOT Logged**:
- Passwords
- API keys
- Session tokens
- Authorization headers
- Cookie values

## 7. CORS Policy

### Allowed Origins

Development:
- `http://localhost:5000`
- `http://127.0.0.1:5000`

Production:
- Configured via `ALLOWED_ORIGINS` environment variable

### Configuration

```typescript
{
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
```

## 8. Data Protection

### Encryption at Rest

- Database: Handled by Neon PostgreSQL
- Passwords: bcrypt hashing
- Sensitive fields: Encrypted before storage (planned)

### Encryption in Transit

- HTTPS/TLS: Required in production
- WebSocket: WSS protocol
- API calls: HTTPS only

## 9. Error Handling

### Information Disclosure Prevention

Production error responses never expose:
- Stack traces
- Database errors
- Internal paths
- Environment variables

Example:

```typescript
// Development
{
  error: "DatabaseError: Connection failed at db.ts:42"
}

// Production
{
  error: "Internal server error"
}
```

### Error Logging

All errors logged to Pino with context:
- Request ID
- User ID (if authenticated)
- Timestamp
- Error type and message

## 10. Dependency Security

### Package Management

- Regular `npm audit` checks
- Automated dependency updates (Dependabot)
- Review of security advisories

### Current Vulnerabilities

As of October 2025:
- 1 low
- 10 moderate
- 1 high
- 1 critical

**Action Required**: Review and update vulnerable packages

## 11. WebSocket Security

### Voice WebSocket (`/ws/voice`)

**Authentication**: Session-based
**Rate Limiting**: 30 connections per minute
**Heartbeat**: 30-second interval
**Timeout**: 60 seconds idle disconnect

**Message Validation**:
```typescript
const messageSchema = z.object({
  type: z.enum(['start', 'stop', 'interrupt', 'heartbeat']),
  data: z.any().optional(),
});
```

## 12. Third-Party API Security

### API Key Management

**Environment Variables**:
- Never committed to version control
- Stored securely in `.env` files
- Rotated regularly

**API Providers**:
- OpenAI API (GPT-4o)
- XAI API (Grok-2)
- ElevenLabs API (TTS)

### Request Signing

Currently: API key in headers
Planned: Request signing for additional security

## 13. Compliance & Privacy

### GDPR

- User consent tracking
- Data export capability
- Data deletion on request
- Privacy policy and terms

See: `GDPR_COMPLIANCE.md`

### Data Retention

- Chat messages: 12 months
- Reading sessions: Indefinite
- Metrics events: 12 months
- Flagged content: 24 months

## 14. Incident Response

### Process

1. **Detection**: Error monitoring alerts
2. **Containment**: Rate limiting, IP blocking
3. **Investigation**: Log analysis
4. **Remediation**: Patch deployment
5. **Documentation**: Post-mortem report

### Contact

Security issues: security@rellio.example.com

## 15. Security Roadmap

### Immediate (P0)
- [x] Helmet with strict CSP
- [x] Rate limiting
- [x] Input sanitization
- [x] Secure session management
- [ ] JWT token rotation

### Short-term (P1)
- [ ] Redis-backed rate limiting
- [ ] Enhanced password requirements (12+ chars)
- [ ] Two-factor authentication
- [ ] Security headers testing

### Long-term (P2)
- [ ] Penetration testing
- [ ] Bug bounty program
- [ ] SOC 2 compliance
- [ ] Regular security audits

## 16. Testing Security

### Manual Testing

```bash
# Test rate limiting
for i in {1..150}; do curl http://localhost:5000/api/health; done

# Test input sanitization
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "<script>alert(\"XSS\")</script>"}'

# Test CSP
# Check browser console for CSP violations
```

### Automated Testing

Planned:
- Security header validation
- OWASP ZAP scans
- Dependency vulnerability scans
- SQL injection testing

---

**Last Reviewed**: October 2025
**Security Contact**: security@rellio.example.com
**Next Review**: January 2026
