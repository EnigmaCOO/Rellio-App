# Rellio migration handover

**Status:** migration preparation only. The Replit app, domain, authentication, and Neon database remain unchanged. Task #98, “Unify scholarly chat modes,” is **MERGED**; its implementation and acceptance tests are in the current workspace.

## Contents

- [Migration inventory](migration-inventory.md) — architecture, source tree, assets, Replit dependencies, and related work.
- [Environment template](migration-environment-template.md) — variable names and descriptions only; no secret values.
- [Backup and restore](migration-backup-restore.md) — safe procedure for database and file assets.

## Source and reproducible commands

The complete application source remains in this repository. Start with `client/`, `server/`, `shared/`, `lib/`, `types/`, `prompts/`, `validators/`, and `scripts/`; project configuration and lockfile are at the repository root. `package-lock.json` is the sole dependency lockfile. There is no second package manager lockfile.

Current Node package commands:

| Purpose | Command |
|---|---|
| Install exact locked dependencies | `npm ci` |
| Development server | `npm run dev` |
| Production build | `npm run build` |
| Production server | `npm run start` |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Unit tests | `npm run test` |
| Synchronize Drizzle schema | `npm run db:push` |
| Seed legacy scripture rows | `npm run db:seed` |

Use Node.js 20 as the current baseline. `npm run build` runs Vite for the browser and bundles the Express entry point with esbuild. `npm run start` serves the generated production build.

## Database and schema status

The runtime uses PostgreSQL through `@neondatabase/serverless` and Drizzle. `DATABASE_URL` is the application connection variable. The current schema definition is `shared/schema.ts`; `drizzle.config.ts` points Drizzle Kit at that file and configures `./migrations` as its output directory.

There is currently **no checked-in `migrations/` directory or SQL migration history**. `npm run db:push` invokes `drizzle-kit push`, which synchronizes the declared schema; it is not a versioned, reviewed migration sequence. Do not treat a newly generated baseline as a faithful description of live production without first comparing it with the actual Neon schema. No database was queried or exported during this preparation.

The schema includes account/auth/session data, scripture text, chat history and rolling memory, reading progress and sessions, verse and EPUB bookmarks, highlights, notes, saved comparisons, moderation records, community records, and Scholar Engine scripture/commentary chunks. The full table inventory and preservation notes are in the migration inventory and backup guide.

## Current verification

Checks were run locally in this Replit workspace on 2026-11-03:

- `npm run test`: passed, 13 test files and 60 tests, including Task #98 mode-scope, per-tradition retrieval, exact citation, in-book passage, and unavailable-evidence tests.
- `npm run lint`: exited successfully with 1,401 warnings and no errors.
- `npm run typecheck`: failed with two TypeScript errors in `server/storage.ts`: an optional highlight color is returned where a required string is expected, and saved-comparison `faiths` is inferred as `unknown[]` instead of `string[]`.
- `npm run build`: passed. Vite reported a JavaScript chunk above 500 kB.

## Sanitized chat connectivity notes

- The latest local development server started and reported ready on port 5000. That log did not contain a chat request, so it does not prove that model calls currently work.
- Earlier development notes recorded Gemini quota/rate-limit failures and an unavailable OpenAI fallback. This is historical context, not a verified current production diagnosis.
- No current production request ID, response status, latency, provider error, or deployment log was available here. The current root cause of the reported connection problem is therefore unverified.
- For a useful production trace, capture request ID, route, HTTP status, latency, selected provider/model, and a sanitized provider error category. Do not log prompts, user identities, email addresses, tokens, or full provider responses.

## GitHub and security readiness

The destination, `https://github.com/EnigmaCOO/Rellio-App`, is public and uses `main` as its default branch. The workspace's configured GitHub remote points to `EnigmaCOO/Rellio`, not `Rellio-App`. A read-only fetch confirmed target `main` at `3135136` and `replit/fix-name` at `0a58f71`; `main` descends from `replit/fix-name` and includes six later commits.

A sanitized new-root snapshot is prepared locally on branch `migration/task-98-unified-scholarly-chat`. It does not inherit the destination's existing commit ancestry and has not been pushed. Existing branches will not be modified or force-pushed.

The existing public history contains a legacy `.env.example` commit with non-empty assignments to secret-like variable names. The values were not displayed. The new-root snapshot excludes that ancestry; existing branches remain unchanged. The repository owner should review the old entries and rotate any credential that may have been live. Rotation does not remove old values from existing Git history.

The GitHub API integration still reports `connect` after attachment. The GitHub CLI has no authenticated account, and SSH access was rejected for lack of a public key. A successful public read/fetch does not establish push authorization; the destination write connection must be restored before the branch can be pushed.

The current `.env.example` and `.handoff/.env.handoff.example` contain names only, with blank values. Tracked-path checks found no database dump, SQL backup, SQLite database, credential file, or private key in the current workspace. A clean application snapshot should retain only the 23 app-imported images and `gita_text.txt` from `attached_assets/`, omit the remaining workspace uploads and attached ZIP archives, and include the 16 runtime EPUBs in `server/books/` based on the user's redistribution-rights confirmation. The live database remains external; no database export was made.

## Google AI Studio handoff

Google’s current AI Studio Build documentation describes importing a project from GitHub. Once the GitHub repository is private, connect the account when prompted and import the repository from Build mode. Treat that as a code import, not an automatic migration of Neon data, Firebase identity, SMTP/SMS accounts, model credentials, or file assets. Keep Replit as the live app until a separately planned migration is tested and approved.

Useful official documentation:

- Google AI Studio Build mode: https://ai.google.dev/gemini-api/docs/aistudio-build-mode
- Replit repository connection: https://docs.replit.com/build/code/connect-your-repository
- Replit repository access: https://docs.replit.com/build/code/manage-repository-access

## Explicitly unchanged

- No app redesign, auth replacement, database replacement, domain change, deployment, production migration, database backup, force-push, or change to the target's `main` branch.
- Task #98 is implemented and merged; details and related merged work are listed in [migration-inventory.md](migration-inventory.md).
- No destination branch has been created or pushed pending review of the existing public history and working GitHub write authorization.
