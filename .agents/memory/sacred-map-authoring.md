---
name: Sacred Map authoring drafts
description: How AI-drafted event content stays grounded and never auto-publishes
---

# Sacred Map authoring (server/domains/sacred-map-authoring)

Drafts deep event content for the Sacred Map, grounded ONLY in passages retrieved
live from the existing scripture service. Drafts are for human review, never auto-published.

## Grounding integrity — the load-bearing rule
The LLM never supplies citations directly. It only selects `passage_id`s from a
numbered list of passages WE retrieved. Final `references` are rebuilt from OUR
trusted retrieval (locator/citation/source), so the model physically cannot
introduce an invented verse — at worst it cites a passage id we already verified,
or an unknown id which we drop.

**Why:** an earlier review flagged that free-text section bodies can still assert
scripture without a citation. Mitigation: any section typed `scripture` with zero
verified `ref_ids` gets an `UNGROUNDED:` flag (so does a draft with zero refs).
Flags surface the gap to the human reviewer instead of silently passing.

**How to apply:** if you add new section types or relax the passage_id remap,
keep the rule that references derive from retrieval, not model text, and keep the
ungrounded-section flagging.

## Never-publish guarantee
PATCH status allowlist is draft_unreviewed | in_review | scholar_reviewed.
`published` is rejected with 400. Nothing in this domain can set published.

## Other constraints
- Store is a single JSON file (server/data/sacred-map-drafts.json), atomic write,
  locators only — retrieved verse text is transient (prompt only), never persisted.
- Surah name→index map is exported as `QURAN_SURAH_NAMES` from
  services/externalScripture.ts; do not re-duplicate it.
- Admin gate opens in non-prod when AUTHORING_ADMIN_EMAILS is unset (local dev
  convenience); in prod the allowlist is enforced. This bypass is intentional.
