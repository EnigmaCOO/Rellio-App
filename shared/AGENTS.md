# shared/AGENTS.md

## Agent: Shared Schema & Types
**Owns:** Centralized Drizzle ORM schema, zod validators, and shared TypeScript interfaces.

---

### End Goal Contribution
Acts as Rellio’s **universal truth source** — ensuring data between server and client remains coherent and type-safe.

---

### Tasks Toward End Goal
- Define tables: Users, Verses, Personas, Reflections, Progress.
- Export zod validators for all DTOs.
- Manage migrations with Drizzle-kit.
- Enforce type safety across services and API responses.
- Version schema updates carefully with release cycles.
