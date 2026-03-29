# Azmyra Skills — Domain Knowledge Library

Skills load on-demand when Claude detects a relevant task. The `skill-eval` hook scores each prompt and suggests which skills to activate.

## Available Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `api-routes` | Creating/fixing API routes | Next.js App Router patterns, auth, pagination |
| `data-adapters` | Market intelligence pipeline | DataAdapter interface, registry, rate limiting |
| `prisma-patterns` | DB queries, schema changes | 36-model schema, JSON fields, safe migrations |
| `ai-agents` | Agent service, autonomy | FastAPI agents, MCP tools, pending actions |
| `ui-components` | Building UI | shadcn/ui, Radix, Tailwind, loading states |
| `testing-patterns` | Writing tests | Vitest, RTL, mocking Prisma + NextAuth |
| `security` | Credentials, encryption | AES-256-GCM, auth guards, Zod validation |
| `debugging` | Bug investigation | Systematic 4-phase debug methodology |

## How to Invoke

**Automatic:** The `skill-eval` hook suggests skills on every prompt.

**Manual:** Tell Claude: "Read `.claude/skills/[skill-name]/SKILL.md` before proceeding."

## Adding New Skills

1. Create `.claude/skills/[skill-name]/SKILL.md`
2. Add frontmatter: `name`, `description` (write it as a trigger instruction for the model)
3. Add a matching entry to `.claude/hooks/skill-rules.json`
4. Keep SKILL.md under 500 lines — use `/references/` subdirectory for larger docs
