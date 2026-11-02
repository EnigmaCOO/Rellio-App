# Migration environment template

This file documents names and purposes only. It intentionally contains no values. Put secrets into the target host’s secret manager; never commit `.env`, print secret values, or put credentials in migration notes.

The checked-in blank templates are `.env.example` and `.handoff/.env.handoff.example`.

## Runtime and database

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Selects development or production behavior. |
| `APP_URL` | Canonical app URL used for links and redirects. |
| `DATABASE_URL` | Neon/PostgreSQL connection string required by the current app. |
| `SESSION_SECRET` | Secret used to sign Express session cookies. |
| `JWT_SECRET` | Secret used to sign access tokens. |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens. |
| `REPL_ID` | Replit-injected development-plugin switch; do not set on the new host. |

## Firebase and Google sign-in

| Variable | Purpose |
|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | Server-side Firebase Admin project identifier. |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin service-account identity. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin private key; secret. |
| `VITE_FIREBASE_API_KEY` | Firebase web SDK configuration; browser-visible, not a server credential. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web Auth domain. |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web project identifier. |
| `VITE_FIREBASE_APP_ID` | Firebase web app identifier. |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional web analytics identifier. |
| `VITE_FIREBASE_APPLE_ENABLED` | Enables the client’s Apple sign-in UI when configured. |
| `VITE_GOOGLE_CLIENT_ID` | Client-side legacy Google OAuth fallback identifier. |
| `GOOGLE_CLIENT_ID` | Server-side Google OAuth client identifier. |
| `GOOGLE_CLIENT_SECRET` | Server-side Google OAuth secret. |
| `GOOGLE_REDIRECT_URI` | Server-side OAuth callback URL; must match provider configuration. |
| `AUTHORING_ADMIN_EMAILS` | Allowlist for Sacred Map authoring administration. |

## Models, Scholar Engine, and voice

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI access used by legacy response paths, voice, and some authoring services; required by current startup validation. |
| `GEMINI_API_KEY` | Gemini generation and embedding access for grounded Ask, in-book Scholar, and embeddings. |
| `XAI_API_KEY` | Optional XAI provider access. |
| `ELEVENLABS_API_KEY` | Optional ElevenLabs voice synthesis. |
| `ASK_MODEL` | Gemini model identifier for grounded Ask. |
| `ASK_MAX_TOKENS` | Grounded Ask response token limit. |
| `SCHOLAR_MODEL` | Gemini model identifier for in-book Scholar. |
| `SCHOLAR_MAX_TOKENS` | Scholar response token limit. |
| `EMBEDDING_MODEL` | Model used to create query and corpus vectors; changing it requires coordinated re-ingestion. |
| `ASK_GROUNDED` | Enables/disables the grounded Ask path. |
| `IN_BOOK_PASSAGE_INJECTION` | Enables grounded passage context in the in-book Scholar path. |
| `IN_BOOK_RETRIEVAL` | Enables in-book semantic/commentary retrieval. |
| `CITATION_VALIDATION` | Citation-validation feature flag. |
| `ENGINE_CACHE` | Scholar Engine cache feature flag. |
| `ENGINE_CACHE_BYPASS` | Development/debug cache bypass. |
| `DEBUG_TRACE` | Enables diagnostic trace logging; keep disabled or tightly controlled in production. |
| `OPENAI_API_KEY_ENV_VAR` | Legacy alias read by some OpenAI helpers; prefer the canonical `OPENAI_API_KEY` after validating code paths. |

## Email and SMS

| Variable | Purpose |
|---|---|
| `EMAIL_PROVIDER` | Selects the email delivery path. |
| `SMTP_HOST` | SMTP server hostname. |
| `SMTP_PORT` | SMTP server port. |
| `SMTP_SECURE` | Whether SMTP uses TLS-on-connect. |
| `SMTP_USER` | SMTP account name. |
| `SMTP_PASS` | SMTP account/app password; secret. |
| `SMTP_FROM` | Display sender identity for SMTP mail. |
| `SENDGRID_API_KEY` | Optional SendGrid API key; secret. |
| `SENDGRID_FROM_EMAIL` | Verified SendGrid sender address. |
| `SENDGRID_SENDER_EMAIL` | Legacy sender-address alias if used by the deployed configuration. |
| `SENDGRID_SENDER_NAME` | Display name for SendGrid messages. |
| `FROM_EMAIL` | Legacy generic sender address. |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier. |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token; secret. |
| `TWILIO_PHONE_NUMBER` | Twilio sender number. |

## Target-host notes

- `server/env.ts` currently requires `DATABASE_URL` and `OPENAI_API_KEY` at startup. `SESSION_SECRET` has a development fallback but must be explicitly set in production; JWT signing secrets must also be securely provisioned.
- The code’s model paths additionally require `GEMINI_API_KEY` when Gemini-backed features are enabled.
- Variables prefixed `VITE_` are compiled into browser code. Never put private credentials in those variables.
- Do not assume the workspace secret names and runtime variable names match. In particular, the current environment inventory includes a Neon-named secret while the server code reads `DATABASE_URL`; map it explicitly in the target’s secret manager.
