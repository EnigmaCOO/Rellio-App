# Migration inventory

This inventory reflects the checked-in source and local asset paths on 2026-11-03. External database contents and provider accounts were not queried; where live data cannot be inferred from the repository, that limitation is stated.

## Application architecture

| Area | Current implementation |
|---|---|
| Browser | React 18 + TypeScript, Vite, Tailwind, Radix-based UI. Main source: `client/src/`. |
| Server | Express 4 + TypeScript, with HTTP and WebSocket voice routes. Entry point: `server/index.ts`; route/service code is under `server/`. |
| Shared types/schema | `shared/`; Drizzle schema is `shared/schema.ts`. |
| Database | Neon-hosted PostgreSQL connection through `@neondatabase/serverless` and Drizzle (`server/db.ts`). Runtime expects `DATABASE_URL`. Replit currently exposes a secret named `NEON_DATABASE_URL` in this workspace snapshot, so verify the target runtime maps the intended Neon URL to `DATABASE_URL`; do not copy a URL into source or chat. |
| Authentication | Existing hybrid system: app-managed username/email/phone + bcrypt + JWT access/refresh tokens; OTP verification; Firebase Auth web sign-in and server-side Firebase Admin token verification; optional server-side Google OAuth fallback. Keep Firebase UIDs and existing user IDs stable during any future move. |
| File storage | The 16 reader EPUBs are local files in `server/books/`. Static images/data live under `public/`, `client/public/`, and some imported workspace assets under `attached_assets/`. No S3/Firebase Storage/object-storage adapter was found. Treat these as deploy/package assets, not durable user-upload storage. |
| Email/SMS | `server/services/notification.ts` uses SMTP through Nodemailer first, SendGrid as an optional email path, and Twilio for SMS. Firebase Authentication handles email verification links in the current hybrid setup. |
| Answer models | Grounded Ask and in-book Scholar call Gemini through `GEMINI_API_KEY`; defaults are configured in `server/config/models.ts`. Legacy routes/services use OpenAI, and XAI is an optional OpenAI-compatible provider. Voice features use OpenAI and optionally ElevenLabs. |
| Embeddings/search | Gemini embeddings (`gemini-embedding-001` by default) are reduced to 768 dimensions and stored in PostgreSQL `vector(768)` columns. Retrieval uses pgvector cosine similarity and a database HNSW index. There is no separate Elasticsearch/Algolia service found. Changing embedding model/dimensions requires a coordinated re-embed and index plan. |
| Maps | Static map/story data is in `client/public/data/` and `server/data/`; map UI and types are in `client/src/features/sacred-map/`. |
| Build | `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, and `drizzle.config.ts`. |

## Schema and migration files

Schema source: `shared/schema.ts`. Tables declared there:

`users`, `sessions`, `otp_codes`, `refresh_tokens`, `scriptures`, `scripture_chunks`, `commentary_chunks`, `chat_messages`, `user_readings`, `spiritual_journeys`, `reading_sessions`, `journey_milestones`, `weekly_progress`, `flagged_messages`, `moderation_logs`, `bookmarks`, `verse_highlights`, `verse_notes`, `book_progress`, `book_bookmarks`, `book_annotations`, `saved_comparisons`, `onboarding_profiles`, `community_circles`, `circle_members`, `community_posts`, `community_replies`, `community_reactions`, and `community_reports`.

No checked-in SQL migration files or `migrations/` directory were found. Available database scripts include:

- `scripts/setup-pgvector.ts` — enables/configures vector support and Scholar Engine vector schema.
- `scripts/seed-scriptures.ts` — legacy scripture seed invoked by `npm run db:seed`.
- `scripts/ingest-scriptures.ts` — scripture chunk ingestion.
- `scripts/ingest-commentary.ts` — commentary chunk ingestion.
- `scripts/migrate-sacred-events.ts` — map event data migration.
- `scripts/post-merge.sh` — Replit post-merge setup, not a production schema migration.

`drizzle-kit push` is the current schema sync command. Before moving data, compare the actual Neon schema to `shared/schema.ts`; neither this inventory nor the code proves that the live database has no drift.

## Scripture editions and reader EPUBs

The app’s book catalog is declared in `server/library/catalog.ts`; its EPUB lookup reads `server/books/`. There are 16 checked-in EPUB files, with 15 entries in the catalog:

- Bhagavad Gita — “As It Is” edition
- The Four Vedas
- Upanishads — Roebuck edition
- Dhammapada — Carter / Ross / Palihawadana edition
- Illustrated King James Bible (KJV)
- Scofield Reference Bible
- Psalms — VanGemeren edition
- Tanakh
- Torah — Simon Abram edition
- Talmud
- The Clear Quran — thematic English translation
- Sahih al-Bukhari
- Sahih Muslim
- Kojiki
- Shri Guru Granth Sahib
- Bhikkhu Bodhi, *A Comprehensive Manual of Abhidhamma* (present in `server/books/`; not a catalog entry)

The same or related EPUB source files are duplicated in `attached_assets/`. The user confirmed redistribution rights for the runtime EPUBs and the Gita source text used by extraction scripts. Preserve any supporting rights records with the release. The clean public snapshot includes the EPUBs from `server/books/` but omits duplicate EPUBs and unrelated workspace uploads from `attached_assets/`.

Scripture text is also modeled in the database `scriptures` table and chunked into `scripture_chunks`; the exact edition/row coverage in the live database was not queried. Related seed and ingestion scripts are under `scripts/`.

## Commentary, embeddings, and search corpus

Commentary content is represented by `commentary_chunks`, with author/source title, language, tradition, canonical anchor reference, namespace, and a 768-dimensional vector. Scripture embeddings are in `scripture_chunks`. The ingestion entry points are `scripts/ingest-commentary.ts` and `scripts/ingest-scriptures.ts`; scholar configuration and approved sources are in `server/config/` and `server/`.

The actual chunk row counts, loaded editions, source licenses, and embedding/index health live in the external PostgreSQL database and were not inspected. Back up both text and vector columns; do not assume the source EPUB files alone can recreate current commentary decisions or user records.

## Images, fonts, and map data

- **Fonts:** no local `.woff`, `.woff2`, `.ttf`, or `.otf` files were found in tracked source. Verify any externally hosted font CSS/network dependency when testing outside Replit.
- **Images:** 93 tracked raster/vector image files appear in the full Replit workspace, including book-cover art, branding/hero images, and attached screenshots/design inputs. The clean snapshot retains the 23 `attached_assets` images directly imported by the app, along with production assets under `public/assets/`, `public/images/`, and `client/public/assets/`; unreferenced workspace screenshots and design inputs are omitted.
- **Map/story data:** `client/public/data/events.json`, `events.deep-example.json`, `figures.json`, `locations.json`, and `religions.json`; additional working data is in `server/data/bhagavad_gita.json` and `server/data/sacred-map-drafts.json`. Related earlier inputs also exist in `attached_assets/`.
- **Outside the repository:** Neon database records and vectors; environment secrets; Firebase, email, SMS, and model-provider account configuration. No separate object storage was found. This means the current runtime book files and static assets must be migrated from the repository/deployment artifact itself.

## Replit-specific dependencies and portability work

- `.replit` defines Node 20, Python 3.11, PostgreSQL 16, Nix packages, port 5000, deployment commands, workflows, and post-merge setup. These are Replit configuration, not a portable deployment manifest.
- `vite.config.ts` conditionally includes `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-runtime-error-modal` when `REPL_ID` is present. These plugins are development conveniences; remove or disable them in an external host configuration, not the application’s core build.
- `scripts/post-merge.sh`, `.replit` workflows, Replit preview port routing, `REPL_ID`, and Replit domain variables are host-specific.
- Standard Node build/start commands exist and the app already binds its server for web hosting, but an external host still needs its own secret injection, port/start health checks, static asset persistence, and database network access.
- The database itself is Neon, not a Replit-managed database. Keep the same database unless a separately approved migration is planned.
- Existing Firebase OAuth callback domains, Google OAuth redirect URIs, SMTP sender setup, and provider quotas are account-side configuration and are not migrated by Git.

## Task #98 and related merged work

Task #98 (“Unify scholarly chat modes”) is **MERGED** in the project task tracker. The current workspace implements explicit Ask, Single Tradition, Compare Across Traditions, and Passage Scholar routing through a shared evidence-first response contract.

The merged implementation scopes retrieval by mode and selected traditions, retrieves scripture independently per tradition, includes source/edition attribution, validates exact quotations against retrieved passages, and returns a clear insufficient-evidence response rather than falling back to an ungrounded answer. In-book Scholar resolves the selected reader text to an indexed canonical passage and edition. Compare can report partial tradition coverage instead of inventing missing evidence.

Acceptance coverage is in `tests/ask/`: mode-scope rules, per-tradition retrieval, citation matching, in-book passage resolution, and safe unavailable responses. Current results are 60 passing tests across 13 files. Lint has no errors (1,401 warnings); typecheck still has two `server/storage.ts` errors; production build passes. See [migration-handover.md](migration-handover.md) for the exact current results and sanitized chat-connectivity notes.

Related merged foundations already present:

- Task #5 — structured response contract for home chat.
- Task #46 — reader Scholar dock receives verse-scoped context.
- Task #55 — EPUB-to-API scripture migration.
- Task #65 — Scholar source-violation retry and voice history.
- Task #80 — central model configuration and rolling memory for in-book Scholar.
- Task #83 — pgvector store and scripture ingestion foundation.
- Tasks #86–#90 — commentary ingestion for Judaism, Islam, Buddhism, Christianity, Hinduism, and Sikhism.
- Task #93 — in-book commentary and semantic retrieval wiring.
- Task #98 — unified evidence-first behavior across Ask, Single Tradition, Compare, and Passage Scholar.

The merged tasks establish capabilities, not proof that every tradition/edition is populated in the live database or that every route has production-quality retrieval. Production request behavior was not verified as part of this handover.
