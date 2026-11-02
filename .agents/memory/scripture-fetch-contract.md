---
name: Scripture fetch + Read deep-link contract
description: How GET /api/scriptures resolves traditions and how the Read tab consumes deep-link params — needed whenever client code constructs a scripture fetch or a Read link.
---

# /api/scriptures contract

`religion` must be a CANONICAL enum value: `christianity | islam | judaism | hinduism | buddhism | shintoism | sikhism` (NOT display keys like `bible`/`quran`/`torah`). Event/reference data uses these same canonical values (`reference.tradition`, `event.religion_id`).

`book` is resolved per tradition:
- **Quran (`alquran.cloud`):** the server maps a surah **display name** (e.g. `"Al-Alaq (The Clot)"`) → surah number via its `quranBooks` list; it does NOT accept a bare surah number. So a client building a Quran fetch must map surah-number → display name itself. The endpoint returns the WHOLE surah with `verse = ayah numberInSurah` and `chapter = 1` — narrow the ayah range client-side.
- **Bible (`bible-api`) / Torah (`sefaria`):** `book` = plain name ("Luke", "Genesis"), `chapter` = number; endpoint returns the whole chapter, narrow the verse range client-side.
- **Cross-chapter ranges** (e.g. Matthew 1:18-2:12) aren't fetched whole — fetch the start chapter and label the result an excerpt.

**Why:** the surah-name requirement is a silent footgun — passing a number or wrong string falls back to surah 1 with no error.

# Read tab deep-link

`library.tsx` only parses the `tradition` query param today (canonical religion id). `religion`/`book`/`chapter` params exist in share URLs but nothing loads a specific verse on mount, so a precise verse deep-link doesn't open the exact chapter yet — link to `/read?tradition=<canonical>` and pass the rest for forward-compat.

# Ask seeding

Navigate to `/ask?seed=<text>`; `ask.tsx` consumes `seed` once and auto-sends via CenterChatPanel.
