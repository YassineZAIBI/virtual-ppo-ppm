# Plan: Robust Signup + Google/Microsoft OAuth Integration

## Overview
Harden the signup flow (CAPTCHA + password strength) and configure real Google & Microsoft OAuth.

---

## Phase 1: Password Strength Enforcement

### Backend — `src/app/api/auth/register/route.ts`
- Add password validation function with rules:
  - Minimum 8 characters (up from 6)
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 digit
  - At least 1 special character (`@#$%^&*!` etc.)
- Return specific error message indicating which rules are not met

### Frontend — `src/app/auth/signin/page.tsx`
- Update `minLength` from 6 to 8
- Add real-time password strength indicator (shown only in register mode):
  - Visual bar (red/orange/yellow/green) + text label (Weak/Fair/Good/Strong)
  - Checklist showing which rules pass/fail as user types
- Update error display for password validation failures

---

## Phase 2: CAPTCHA Integration (Cloudflare Turnstile)

**Why Turnstile over reCAPTCHA:** Free, privacy-friendly, no "select all traffic lights" UX friction — invisible by default, only challenges when suspicious.

### Setup
- Install: `npm install @marsidev/react-turnstile` (lightweight React wrapper)
- Env vars: `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`
- Add to `.env.example`

### Frontend — `src/app/auth/signin/page.tsx`
- Add `<Turnstile>` widget below the password field (only in register mode)
- Capture the token in state, send it with the registration request
- Also add to sign-in form as invisible challenge

### Backend — `src/app/api/auth/register/route.ts`
- Accept `captchaToken` in request body
- Verify token against Cloudflare's `https://challenges.cloudflare.com/turnstile/v0/siteverify` API
- Reject registration if verification fails
- Skip verification in development if env vars not set (graceful fallback)

---

## Phase 3: Google OAuth (Real Integration)

### Google Cloud Console Setup (user action)
- Create OAuth 2.0 credentials in Google Cloud Console
- Authorized redirect URI: `https://ai.theproductowner.org/api/auth/callback/google`
- Scopes: `openid`, `email`, `profile`

### Code Changes
- `src/lib/auth.ts` — Google provider is already configured, just needs env vars
- `.env.example` — Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` entries (already there but confirm)
- Cloud Run — Set env vars via `gcloud run services update`

### Frontend
- Google button already exists in signin page — no changes needed
- Works immediately once env vars are set

---

## Phase 4: Microsoft OAuth (Real Integration)

### Azure AD App Registration Setup (user action)
- Register app in Azure Portal → App registrations
- Redirect URI: `https://ai.theproductowner.org/api/auth/callback/azure-ad`
- API permissions: `User.Read`, `openid`, `email`, `profile`

### Code Changes
- `src/lib/auth.ts` — Azure AD provider already configured, just needs env vars
- `.env.example` — Add `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`
- Cloud Run — Set env vars via `gcloud run services update`

### Frontend
- Microsoft button already exists — no changes needed

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/auth/register/route.ts` | Password strength validation + CAPTCHA verification |
| `src/app/auth/signin/page.tsx` | Password strength indicator + Turnstile widget |
| `.env.example` | Add Turnstile + OAuth env var entries |
| `package.json` | Add `@marsidev/react-turnstile` dependency |

## Files NOT Modified (already ready)
- `src/lib/auth.ts` — Google & Azure AD providers already coded with conditional enable
- `src/middleware.ts` — Already handles OAuth callback routes

---

## Deployment Steps
1. Build & deploy code changes
2. User creates Google OAuth credentials + Azure AD app registration
3. Set env vars on Cloud Run:
   - `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`
