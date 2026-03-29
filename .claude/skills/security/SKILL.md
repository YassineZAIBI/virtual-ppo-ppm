---
name: security
description: Use when handling credentials, API keys, tokens, passwords, or any sensitive data in Azmyra. Covers AES-256-GCM encryption, Prisma middleware, auth guards, Zod validation, and Turnstile CAPTCHA.
allowed-tools: Read, Grep
---

# Security — Azmyra Patterns

## Encryption (AES-256-GCM)

All sensitive credentials are encrypted at rest using `src/lib/encryption.ts`.

```typescript
import { encrypt, decrypt } from '@/lib/encryption';

// Encrypt before storing
const encryptedToken = encrypt(rawApiKey);
await db.userSettingsRecord.update({
  where: { userId },
  data: { jiraApiToken: encryptedToken }, // stored as iv:authTag:encrypted
});

// Decrypt before using
const settings = await db.userSettingsRecord.findUnique({ where: { userId } });
const jiraToken = decrypt(settings.jiraApiToken);
```

**Format stored:** `iv:authTag:encrypted` (colon-separated hex)
**Key:** `CREDENTIALS_ENCRYPTION_KEY` env var — 64 hex chars (32 bytes)

## Which Fields Are Encrypted

Via Prisma middleware in `src/lib/db.ts`, these `UserSettingsRecord` fields auto-encrypt/decrypt:
- `jiraApiToken`, `jiraPassword`
- `confluenceApiToken`
- `slackBotToken`
- `smtpPassword`
- `zoomClientSecret`
- Any field ending in `ApiToken`, `ApiKey`, `Password`, `Secret`

When adding a new integration credential field → add it to the middleware list in `db.ts`.

## Auth Guards in API Routes

```typescript
// Every API route — first thing, no exceptions
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Always scope DB queries to the authenticated user
const item = await db.initiative.findFirst({
  where: { id: params.id, userId: session.user.id }, // ← never skip userId check
});
```

## Input Validation with Zod

```typescript
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['idea', 'discovery', 'validation', 'definition', 'approved']),
});

const result = createSchema.safeParse(await req.json());
if (!result.success) {
  return NextResponse.json(
    { error: result.error.flatten().fieldErrors },
    { status: 400 }
  );
}

// Use result.data — it's typed and validated
await db.initiative.create({ data: { ...result.data, userId: session.user.id } });
```

## Cloudflare Turnstile (Registration)

```typescript
// Verify on the server — never trust client-side only
const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  body: new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!,
    response: body.turnstileToken,
  }),
});
const { success } = await turnstileRes.json();
if (!success) {
  return NextResponse.json({ error: 'CAPTCHA verification failed' }, { status: 403 });
}
```

## Share Links Security

Share links use a random token (`ShareLink.token`). Access level is enforced server-side:

```typescript
const share = await db.shareLink.findUnique({
  where: { token },
});
if (!share || (share.expiresAt && share.expiresAt < new Date())) {
  return NextResponse.json({ error: 'Link expired or not found' }, { status: 404 });
}
// Check share.accessLevel before allowing writes
```

## Gotchas

- **Never log decrypted credentials** — not even in development console
- **Never store plaintext API keys** — all third-party credentials go through `encryption.ts`
- **LLM API keys stay client-side** — they're in Zustand/localStorage, never touch the server DB
- **Always validate `userId` ownership** — never rely on `id` alone to authorize access to a record
- **Zod before any DB write** — never write unvalidated user input to the database
