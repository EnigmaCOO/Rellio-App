# Safe backup and restore procedure

This is an operational handover, not a backup run. No database or user data was exported during migration preparation. Never commit backup files or paste connection strings into chat, shell transcripts, or GitHub.

## Before moving any data

1. Confirm the source and destination Neon projects and environments with the owner. Use a new isolated destination for rehearsal; do not restore over the live database.
2. Place source and destination connection strings into a protected local shell/session from the secret manager. Do not echo them or store them in a file inside the repository.
3. Schedule a write freeze or take a consistent provider snapshot immediately before cutover. Record the snapshot timestamp and target database identity without recording credentials.
4. Store backups encrypted outside Git, restrict access, and set a retention/deletion date.

## PostgreSQL backup

Use the `pg_dump` and `pg_restore` tools compatible with the Neon PostgreSQL server version. A custom-format dump includes schema, rows, indexes, sequences, and vector columns:

```sh
umask 077
mkdir -p "$HOME/rellio-migration-backups"
pg_dump --format=custom --no-owner --no-privileges \
  --dbname="$DATABASE_URL" \
  --file="$HOME/rellio-migration-backups/rellio-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_restore --list "$HOME/rellio-migration-backups/rellio-<timestamp>.dump" >/dev/null
sha256sum "$HOME/rellio-migration-backups/rellio-<timestamp>.dump"
```

The placeholder path above is not a credential. Select the actual dump filename locally; do not add the backup directory to the project. Copy the encrypted file and checksum to a separately controlled backup destination.

## Restore to an empty staging database

Create an empty destination database/branch in Neon using its provider console. Put its connection string in a protected environment variable, then restore:

```sh
pg_restore --exit-on-error --no-owner --no-privileges \
  --dbname="$RESTORE_DATABASE_URL" \
  "$HOME/rellio-migration-backups/rellio-<timestamp>.dump"
```

Do not use `--clean` against a database that might contain valuable data. For initial verification, restoring into a new empty database makes accidental replacement less likely. Run app checks against staging before changing any production routing.

`pg_dump`/`pg_restore` preserve explicit row IDs and sequence state when the complete schema and data are restored. Validate row counts, primary-key maxima/sequences, foreign-key relationships, and representative records for user IDs, Firebase UIDs, EPUB bookmarks/progress, annotations, conversations, and vector rows. Do not export samples containing user data into this repository.

## Data that must remain linked

- **Identity:** Preserve `users.id` and `firebase_uid`; do not create new user records as a substitute for migration.
- **Reader state:** Preserve `book_progress`, `book_bookmarks`, `book_annotations`, verse `bookmarks`, `verse_highlights`, and `verse_notes`; maintain stable book IDs/edition files so stored CFI references still resolve.
- **Conversations:** Preserve `chat_messages` and related session/conversation memory. Keep session IDs stable where needed for history.
- **Other user records:** Preserve `saved_comparisons`, onboarding, reading sessions/progress, moderation records, and community data where in scope.
- **Tokens:** Existing session cookies and JWTs may become invalid if signing secrets change. Keep the current secrets in the secret manager during a controlled cutover or explicitly plan token expiration/sign-in. Never place these secrets in the dump notes or Git.
- **Embeddings:** `scripture_chunks` and `commentary_chunks` store 768-dimensional vectors in PostgreSQL. Include these tables in the dump. If the model, dimensions, text normalization, or corpus changes, plan a versioned re-embedding rather than mixing incompatible vectors.

## File assets

The runtime book catalog reads EPUBs from `server/books/`; these files are part of the application tree today. Static book covers, logos, images, and map JSON/GeoJSON are in `public/`, `client/public/`, and imported workspace assets in `attached_assets/`. No external object-storage service was found.

For each file directory approved for transfer:

1. Copy files without renaming them, preserving relative paths.
2. Generate a sorted SHA-256 manifest on source and destination and compare it.
3. Test the book catalog, EPUB open/read, images, and map data on staging.
4. Keep originals and backups until the staging checks and production cutover are explicitly approved.

If large files move to durable object storage in a future project, preserve stable book IDs and filenames/metadata and update the reader’s serving URL carefully. That storage redesign is outside this preparation.

## Repository protections

`.gitignore` excludes local `.env*` files (while allowing blank templates), common backup folders, database dump/archive suffixes, SQLite files, logs, and attached/handoff ZIP archives. A Git ignore rule does not remove a file already committed. The existing `Rellio-App` history still contains an older environment example with non-empty secret-like assignments. The published sanitized snapshot uses a new root and does not inherit that history; existing branches were not rewritten. The owner should review the old entries and rotate any credentials that may have been live before creating another history-preserving public branch. See [migration-handover.md](migration-handover.md).
