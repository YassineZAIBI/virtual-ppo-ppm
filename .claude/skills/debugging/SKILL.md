---
name: debugging
description: Use when investigating bugs, runtime errors, TypeScript errors, or unexpected behavior in Azmyra. Covers the most common failure patterns and a 4-phase systematic methodology.
allowed-tools: Read, Grep, Glob, Bash(npm:*), Bash(npx:*)
---

# Debugging — Azmyra Systematic Methodology

## Phase 1 — Reproduce

State the bug as: **"When [action], [observed behavior] instead of [expected behavior]"**

Never touch code until you can state this clearly.

## Phase 2 — Locate

### Check the most common Azmyra failure points first:

**1. Prisma JSON string crash** (`TypeError: .map is not a function`)
```typescript
// The field is a string, not an array/object
// Find all usages of the field
grep -r "\.extractedFacts\." src/ --include="*.ts" --include="*.tsx"
// Fix: JSON.parse() before use
const facts = JSON.parse(item.extractedFacts || '[]');
```

**2. Missing `JSON.parse()` in component** (renders raw `{}` or `[]`)
```typescript
// Symptom: component shows "[object Object]" or "0 items" despite data existing
// Check the view component for direct use of JSON string fields
```

**3. Auth failure in API route** (unexpected 401)
```typescript
// Check if getServerSession is called with authOptions
// Check if NEXTAUTH_SECRET is set correctly in .env
// Check if the request is missing cookies (cross-origin?)
```

**4. LLM config missing** (agent returns error)
```typescript
// The route expects llmConfig in request body
// Check the frontend fetch call — is it including settings from Zustand?
const { settings } = useAppStore();
await fetch('/api/agents/strategy', {
  method: 'POST',
  body: JSON.stringify({ message, llmConfig: settings.llmConfig }), // ← must be here
});
```

**5. Relative import breaking build**
```bash
npx tsc --noEmit 2>&1 | grep "Cannot find module"
# Fix: replace ../ paths with @/ alias
```

**6. Radix Dialog layout broken** (content overflowing, no scroll)
```tsx
// DialogContent uses grid — Tailwind grid overrides don't apply
// Fix: use inline styles
style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}
```

**7. Prisma client not updated after schema change**
```bash
npx prisma generate  # always after schema.prisma edits
```

## Phase 3 — Fix

Rules:
- Make the **minimal change** that fixes the issue
- Do not refactor unrelated code while fixing a bug
- If the fix touches more than 3 files, confirm scope before proceeding

## Phase 4 — Verify

```bash
# Type check
npx tsc --noEmit

# Related tests
npm run test -- --related

# If API route: test with curl or Postman
# If component: manual browser check with DevTools open
```

## Azmyra-Specific Error Reference

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `TypeError: x.map is not a function` | Prisma JSON string field used without parse | `JSON.parse(field \|\| '[]')` |
| `401 Unauthorized` from own API | `getServerSession()` returning null | Check NEXTAUTH_SECRET, cookie presence |
| `Cannot read properties of undefined` on `session.user.id` | Auth check missing or session expired | Add auth guard |
| `Module not found: '../lib/...'` | Relative import instead of `@/` | Replace with `@/lib/...` |
| `PrismaClientKnownRequestError: P2002` | Unique constraint violation | Check for duplicate before create, or use upsert |
| `fetch failed` to AGENT_SERVICE_URL | Python agent not running | Start with `docker-compose up` |
| `[object Object]` displayed in UI | Rendering JSON string field directly | `JSON.parse()` first |

## Useful Debug Commands

```bash
# Find all usages of a specific field
grep -rn "extractedFacts\|metadata\|reportMetadata" src/ --include="*.ts" --include="*.tsx"

# Find all relative imports (should be zero)
grep -rn "from '\.\." src/ --include="*.ts" --include="*.tsx"

# Check for missing await on Prisma calls
grep -rn "db\.\w\+\.\w\+" src/app/api --include="*.ts" | grep -v "await\|then\|Promise"

# TypeScript errors only
npx tsc --noEmit 2>&1 | grep "error TS"
```
