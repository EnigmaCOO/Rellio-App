# Rellio Engineer Handoff

This archive contains the Rellio full-stack application source, runtime EPUB
library, required frontend assets, tests, configuration, and package lockfile.
It is intended for an engineer to run locally and continue development.

## What is included

- React/Vite frontend in `client/`
- Express/TypeScript backend in `server/`
- Shared schema/contracts in `shared/`
- Retrieval, prompt, validation, and model configuration in `lib/`, `prompts/`,
  `validators/`, `types/`, and `config/`
- Standalone scripture/data utilities at the project root and in `prompt/`
- EPUB files in `server/books/`
- Runtime image/font assets referenced by the application
- Database schema/configuration and scripts
- Tests and documentation
- `package.json` and `package-lock.json`
- `.env.example` as a safe configuration template

## Deliberately excluded

- API keys, passwords, private keys, session tokens, and database credentials
- `.env` files and Replit-managed secrets
- `node_modules/`, `dist/`, `.cache/`, `.git/`, logs, and machine-local state
- The pasted credential-looking file under the original `attached_assets/`
- Unreferenced design screenshots and other workspace-only attachments

## Local setup

Requirements:

- Node.js 20+
- npm 10+
- PostgreSQL 16+ (Neon or local PostgreSQL works)
- Optional: Python 3.11 for the included data/extraction utilities
- Optional system package: `poppler_utils` if PDF utilities are used

```bash
npm install
cp .env.example .env
# Edit .env with real values; never commit it.
npm run typecheck
npm run dev
```

The development server listens on `http://localhost:5000`.

## Minimum configuration

Set these before starting:

```text
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
SESSION_SECRET=<long random value>
```

For the in-book Scholar, grounded Ask, and semantic retrieval:

```text
GEMINI_API_KEY=...
```

Firebase authentication requires both the browser `VITE_FIREBASE_*` values and
the backend `FIREBASE_ADMIN_*` values. Without Firebase configuration, an
engineer can still work on the application locally, but sign-in behavior will
be limited.

SMTP, SendGrid, Twilio, ElevenLabs, xAI, and Google OAuth are optional and are
listed in `.env.example`.

## Database setup

The application expects PostgreSQL and uses Drizzle ORM.

```bash
npm run db:push
```

The grounded retrieval engine also uses pgvector. If the engineer needs to
rebuild the scripture vector store:

```bash
npx tsx scripts/setup-pgvector.ts
npx tsx scripts/ingest-scriptures.ts quran
```

Review the ingestion script before adding additional corpora. Embeddings use
`GEMINI_API_KEY` and the configured `EMBEDDING_MODEL`.

## Useful commands

```bash
npm run dev          # development server
npm run build        # production frontend/backend build
npm run start        # run the production build
npm run typecheck    # TypeScript checks
npm run lint         # ESLint
npm run test         # Vitest
```

## AI model routing summary

- In-book Scholar: Gemini via `SCHOLAR_MODEL` (default
  `gemini-2.5-flash`), with no silent cross-provider fallback.
- Home Ask grounded path: Gemini via `ASK_MODEL` (default
  `gemini-2.5-flash`) when `ASK_GROUNDED` is enabled.
- Home Ask legacy fallback and other non-Scholar paths: OpenAI `gpt-4o`;
  xAI/Grok may be used in the provider factory when explicitly requested and
  configured.
- Embeddings: Gemini via `EMBEDDING_MODEL` (default
  `gemini-embedding-001`).

Provider accounts must have active credits. A configured key with exhausted
credits still produces provider errors.

## Important engineering notes

- The static shelf in `client/src/config/bookshelfData.ts` and the server EPUB
  catalog in `server/library/catalog.ts` currently use different identifiers
  for some of the same books. Normalize these before adding or linking more
  books.
- The runtime EPUB catalog is built from files in `server/books/`.
- Do not redistribute a translation or EPUB unless its copyright and license
  permit it. Several original workspace filenames referenced ebook sites whose
  redistribution status was not verified; review those files before publishing.
- The development defaults for `ASK_GROUNDED`, `IN_BOOK_PASSAGE_INJECTION`,
  `IN_BOOK_RETRIEVAL`, `CITATION_VALIDATION`, and `ENGINE_CACHE` are documented
  in `FEATURE_FLAGS.md`.

## Verification checklist

After supplying configuration:

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run dev
```

Then verify:

1. `/api/v1/library` returns the expected EPUB catalog.
2. An EPUB opens from `/reader/<book-id>`.
3. A book-specific Scholar request reaches `/api/chat`.
4. Home Ask works with and without selected sources.
5. Authentication and database-backed chat history work when Firebase and
   PostgreSQL are configured.