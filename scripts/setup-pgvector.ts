/**
 * pgvector bootstrap — run with `npx tsx scripts/setup-pgvector.ts`
 *
 * drizzle-kit push cannot create the pgvector extension or an HNSW vector index,
 * so this script owns that DDL. It is fully idempotent (safe to re-run) and is
 * the authoritative creator of the `scripture_chunks` and `commentary_chunks`
 * tables for the Scholar Engine vector store.
 *
 * The embedding dimension (768) is pinned here AND in shared/schema.ts AND in
 * server/config/models.ts (EMBEDDING_DIMENSIONS) — all three must agree with the
 * embedding model (default gemini-embedding-001, reduced to 768 dims).
 *
 * Run this once before the first ingestion (scripts/ingest-scriptures.ts).
 */

import { fileURLToPath } from "url";

const EMBEDDING_DIMENSIONS = 768;

export async function setupPgvector(): Promise<void> {
  const { pool } = await import("../server/db.js");

  console.log("🔧 Ensuring pgvector extension…");
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");

  console.log("🔧 Ensuring scripture_chunks table…");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scripture_chunks (
      id                 SERIAL PRIMARY KEY,
      ref_id             TEXT NOT NULL,
      tradition          TEXT NOT NULL,
      book               TEXT NOT NULL,
      chapter            INTEGER NOT NULL,
      verse              INTEGER NOT NULL,
      original_text      TEXT NOT NULL,
      original_lang      TEXT NOT NULL,
      translation        TEXT NOT NULL,
      translation_source TEXT NOT NULL,
      embedding          vector(${EMBEDDING_DIMENSIONS}) NOT NULL,
      namespace          TEXT NOT NULL
    );
  `);

  console.log("🔧 Ensuring idempotency unique index (ref_id, namespace)…");
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS scripture_chunks_ref_ns_uq
      ON scripture_chunks (ref_id, namespace);
  `);

  console.log("🔧 Ensuring scoping index (namespace, tradition)…");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS scripture_chunks_ns_tradition_idx
      ON scripture_chunks (namespace, tradition);
  `);

  console.log("🔧 Ensuring HNSW cosine index on embedding…");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS scripture_chunks_embedding_idx
      ON scripture_chunks USING hnsw (embedding vector_cosine_ops);
  `);

  console.log("🔧 Ensuring commentary_chunks table…");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS commentary_chunks (
      id           SERIAL PRIMARY KEY,
      source_id    TEXT NOT NULL,
      source_title TEXT NOT NULL,
      author       TEXT NOT NULL,
      on_ref       TEXT NOT NULL,
      chunk_index  INTEGER NOT NULL DEFAULT 0,
      text         TEXT NOT NULL,
      language     TEXT NOT NULL,
      tradition    TEXT NOT NULL,
      embedding    vector(${EMBEDDING_DIMENSIONS}) NOT NULL,
      namespace    TEXT NOT NULL
    );
  `);

  console.log("🔧 Ensuring commentary idempotency unique index (namespace, on_ref, chunk_index)…");
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS commentary_chunks_ns_ref_chunk_uq
      ON commentary_chunks (namespace, on_ref, chunk_index);
  `);

  console.log("🔧 Ensuring commentary scoping index (namespace, tradition)…");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS commentary_chunks_ns_tradition_idx
      ON commentary_chunks (namespace, tradition);
  `);

  console.log("🔧 Ensuring commentary lookup index (tradition, on_ref)…");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS commentary_chunks_tradition_ref_idx
      ON commentary_chunks (tradition, on_ref);
  `);

  console.log("🔧 Ensuring commentary HNSW cosine index on embedding…");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS commentary_chunks_embedding_idx
      ON commentary_chunks USING hnsw (embedding vector_cosine_ops);
  `);

  console.log("✅ pgvector store is ready.");
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  setupPgvector()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ pgvector setup failed:", err);
      process.exit(1);
    });
}
