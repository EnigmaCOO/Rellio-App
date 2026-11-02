---
name: GitHub history security
description: Security caution for publishing Rellio-App snapshots.
---

Before publishing a history-preserving branch to `EnigmaCOO/Rellio-App`, account for the existing public history's legacy environment example containing non-empty assignments to secret-like variable names. The values were not displayed or copied into memory. A new-root snapshot avoids inheriting that history, but it does not clean or alter existing branches. The repository owner should review the old entries and rotate any credentials that may have been live.

**Why:** A public branch inherits all reachable commits; blanking the current template alone does not remove older values.

**How to apply:** Before a GitHub export, inspect the destination's existing history without printing values. Prefer a clean snapshot branch when preserving ancestry would carry potentially sensitive historical content; never rewrite or force-push existing branches without explicit approval.
