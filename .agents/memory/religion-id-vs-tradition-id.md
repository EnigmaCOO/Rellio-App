---
name: religion id vs tradition id mismatch
description: shared/schema religionSchema ids do not 1:1 match types/scholar TraditionId — Shinto differs
---

When mapping the app's religion enum onto scholar configs, do NOT assume the
string ids are identical across the two type systems.

- `shared/schema.ts` `religionSchema` (the value carried in chat context / DB):
  `christianity, islam, judaism, hinduism, buddhism, sikhism, shintoism`
- `types/scholar.ts` `TraditionId` (used by `config/scholars.ts` `.tradition`):
  `islam, christianity, judaism, hinduism, sikhism, buddhism, shinto`

The mismatch is **`shintoism` (schema) vs `shinto` (TraditionId)**. Every other
id happens to match today, but that is coincidental.

**Why:** matching scholars by `.tradition === religion` silently drops Shinto and
is fragile to future renames.

**How to apply:** keep an explicit `Record<Religion, ScholarId>` lookup (see
`server/services/inBookGrounding.ts` `RELIGION_TO_SCHOLAR_ID`) rather than
string-equality matching. `SCHOLARS` is keyed by `ScholarId`
(`mufti/priest/rabbi/guru/bhikkhu/granthi/kannushi`), not by religion.

## Non-standard traditions are unreachable through the verse-fetch gate

A religion having a scholar config + a `RELIGION_TO_SCHOLAR_ID` entry is NOT
enough for its scholar framing to actually run in-book. `buildInBookGrounding`
historically bailed to `null` (→ legacy persona path) whenever
`fetchScriptureContent` returned no verses — and Shinto has **no fetchable
corpus** (the `externalScripture` switch has no `shintoism` case → `default:
return []`). So the kannushi config existed but its framing never executed.

**Why:** "config + routing map exists" silently masks that the framing is dead
code for any tradition without a verse corpus.

**How to apply:** branch on `scholar.commentaryDepth === "nonstandard"` (the
honest signal that a tradition doesn't fit scripture+commentary+ruling). For
those, skip the empty-verses bail-out and skip semantic retrieval, and let the
scholar config carry an empty-context prompt. Reachability stays gated by
`IN_BOOK_PASSAGE_INJECTION` so the legacy path remains when the flag is off.
