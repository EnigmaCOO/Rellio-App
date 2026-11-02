---
name: Grounded scholarly response contract
description: Evidence and scope rules shared by Ask, Single, Compare, and Passage Scholar
---

# Grounded scholarly response contract

The existing `StructuredChatResponse` remains the frontend contract for Ask and
Compare. Do not introduce a second response shape unless the UI and API migrate
together.

**Why:** the current chat renderer consumes structured summaries, sections,
references, limitations, and coverage. Keeping that contract lets the modes share
one retrieval and validation pipeline.

**How to apply:**
- Ask is an explicit broad-evidence mode; Single requires one selected tradition
  or source; Compare requires at least two traditions and retrieves each one
  independently.
- Passage Scholar requires selected reader text that resolves to an exact
  canonical passage. Never substitute a chapter, book, sample verse, or model
  memory when the selection cannot be resolved.
- Rebuild references from retrieved passages and commentary, display source and
  edition attribution, validate exact quotations, and require each comparative
  tradition section to cite evidence from that same tradition.
- On retrieval, model, scope, or citation failure, return an explicit
  insufficient-evidence response. Never fall back to an ungrounded legacy
  builder.
- Cache only grounded contexts or answers. Do not cache degraded or
  unverified output.
