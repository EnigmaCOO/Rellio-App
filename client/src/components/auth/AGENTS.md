# client/src/components/auth/AGENTS.md

## Agent: Authentication Components
**Owns:** All login, signup, OTP, and OAuth components.

---

### End Goal Contribution
This agent enables **secure and universal access** — ensuring every user can join Rellio’s global spiritual circle safely while previewing what awaits inside.
It primes newcomers for the immersive homepage, persona gallery, and 3D dashboard handoff by:
- Framing sign-in flows with **interactive book browsing highlights** so users know reading begins immediately.
- Introducing the **Priest, Mufti, and Universal Guide** personas during onboarding (copy, imagery, or voice snippets).
- Passing authenticated context to the **real-time 3D dashboard** so progress, playlists, and voice settings load instantly.

---

### Tasks Toward End Goal
- Connect Firebase Auth + Google OAuth.
- Add `/api/auth/session` synchronization.
- Design OTP verification flow with persona-assisted guidance and preview hooks.
- Display spiritual welcome quotes and dashboard teaser animations during onboarding.
- Handle rate limiting gracefully.
