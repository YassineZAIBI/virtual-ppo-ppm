# Code Style Rules — Azmyra

These rules are always active (not skill-gated). Claude applies them to every code change.

## TypeScript

- No `any` — use `unknown` and narrow, or create a proper type in `types.ts`
- Prefer `interface` over `type` for object shapes
- All new types go in `src/lib/types.ts` — not in component files
- Use `z.infer<typeof schema>` to derive types from Zod schemas — no duplication

## Imports

- Always `@/` alias — never relative paths
- Group: external libs → internal `@/lib` → internal `@/components` → types
- No unused imports — they cause TypeScript warnings

## Functions

- Async functions that call `db` or `fetch` must always be `await`'d
- Error handling: `try/catch` in API routes; propagate in services
- No silent `catch(e) {}` — at minimum `console.error(e)` with context

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase | `InitiativeCard` |
| Hooks | camelCase prefixed `use` | `useInitiatives` |
| Services | camelCase | `llmService` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |
| DB models (Prisma) | PascalCase singular | `Initiative` |
| API route files | `route.ts` | `src/app/api/initiatives/route.ts` |

## Comments

- Comment **why**, not **what** — code should be self-documenting for the what
- Always comment Prisma JSON string fields: `// JSON stored as string — JSON.parse() on read`
- Always comment non-obvious Radix workarounds with a brief explanation

## File Length

- Views: soft cap at 400 lines — extract sub-components if growing
- API routes: soft cap at 150 lines — extract service functions to `src/lib/services/`
- Types: no cap — `types.ts` is a central registry
