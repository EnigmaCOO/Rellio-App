---
name: drizzle-kit push post-merge interactivity
description: Why post-merge db:push hangs and how to keep it non-interactive
---

# drizzle-kit push is interactive; post-merge runs with stdin closed

`scripts/post-merge.sh` runs `npm install && npm run db:push` (`db:push` = `drizzle-kit push`). Post-merge runs with stdin closed, so any interactive drizzle prompt = immediate failure/hang.

drizzle-kit push prompts (select-style, `❯` default) whenever the live dev DB has drifted from `shared/schema.ts`:
- "Is X table created or renamed from another table?" — triggered when a table is missing AND another is being dropped at the same time (ambiguous).
- "Do you want to truncate Y table?" — triggered when adding a UNIQUE constraint to a table that already has rows.

**Key trap:** `--force` does NOT answer these select prompts (it only auto-accepts data-loss statements). Closed stdin → EOF → fail. Piping `yes ""` into it is unreliable (observed hang).

**Reliable fix:** make the dev DB exactly match the schema so push has nothing to prompt about (target state = `[i] No changes detected`). Practical recipe:
1. `npx drizzle-kit generate` is non-interactive and dumps full-schema DDL (when no prior snapshot) — use it as a source of exact `CREATE TABLE` / `CONSTRAINT` DDL, then delete the generated `migrations/` (this repo uses push, not migrate).
2. Compare schema tables vs `information_schema.tables`, and schema `*_unique` constraints vs `pg_constraint contype='u'`, to find every diff at once (avoids prompt whack-a-mole).
3. Before adding a UNIQUE constraint, check the column has no duplicate rows or it will error.
4. Drop only stale, EMPTY orphan tables (verify `count(*)=0`); never rename — drizzle's rename inference can map an unrelated table onto a new one.

**Why:** post-merge must be fully non-interactive (skill: stdin closed). Keep `db:push -- --force` in the script for steady-state safety, but the real cure is zero drift. Bump post-merge `timeoutMs` (`setPostMergeConfig`) above the real runtime — `npm install` + push measured ~49s, so 20s default times out.
