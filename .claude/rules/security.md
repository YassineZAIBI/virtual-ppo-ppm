# Security Rules — Azmyra

These are hard rules. Claude never violates them regardless of context.

## Credentials

1. **Never store LLM API keys in the database** — Zustand/localStorage only
2. **All third-party credentials** (Jira, Slack, SMTP, Zoom) go through `encryption.ts` before DB write
3. **Never log decrypted values** — not even `console.log` in dev
4. **Never commit `.env` files** — use `.env.example` with placeholder values

## API Routes

5. **Every route** starts with `getServerSession(authOptions)` auth check
6. **Every DB query** scopes to `userId: session.user.id` — never query across users
7. **Every POST body** is validated with Zod before DB write

## Database

8. **Never run `prisma migrate reset`** — it drops all production data
9. **Never run destructive SQL** without explicit user confirmation
10. **Sensitive field additions** to `UserSettingsRecord` must be added to the encryption middleware list in `db.ts`

## Frontend

11. **Never put secrets in client-side code** — env vars exposed to browser must be `NEXT_PUBLIC_` and must be non-sensitive
12. **Share link tokens** are validated server-side — never trust client-passed access levels
