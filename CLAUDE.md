# Clann — Family Organiser

## What this is
A family organiser PWA for managing children's activities, schedules, and weekend clash detection. Built as a personal learning project.

## ⚠️ Critical rules

- **PERSONAL PROJECT ONLY** — never use work accounts or work infrastructure
  - Personal GitHub: `deeuniacke-ops` on `github.com` (repo: `github.com/deeuniacke-ops/FamilyOrg`)
  - Vercel: team `cluichi`, project `family-org` — auto-deploys from `main` branch
  - Live URL: `https://family-org-omega.vercel.app`
  - Work GitHub (`deeuniacke` on `github.yelpcorp.com`) must NEVER be used
  - Note: `Duniacke` on github.com was used briefly by mistake and is NOT the account to work from
- **package-lock.json** must only contain `registry.npmjs.org` URLs — never `npm.yelpcorp.com`. If regenerating the lock file, always run: `npm install --registry=https://registry.npmjs.org/`
- **Don't rewrite large chunks of the app** — make targeted changes. The user has been burned by AI sessions replacing working code with broken versions.
- **Test the build** before pushing: `npx next build`
- **Push only to `main`** — Vercel auto-deploys from there

## Tech stack
- **Next.js 15** (App Router) with TypeScript
- **Tailwind CSS 3.4** for styling
- **React 19** (stable, not RC)
- **Firestore** (project `clann-d9da7`) for shared data — children/activities sync live across devices/family members, with localStorage as an instant-paint cache
- **@anthropic-ai/sdk** for voice parsing (optional — app works without API key)
- **Vercel** for hosting

## Project structure
```
src/
  app/
    page.tsx          — Home: 3-day calendar with timeline, clash detection
    layout.tsx        — Root layout with Header, BottomNav, Toast
    manage/page.tsx   — Manage children and their activities
    add/page.tsx      — Add activity (with voice input option)
    api/parse-voice/  — Claude API route for smart voice parsing
    globals.css       — Tailwind + custom utilities
  components/
    BottomNav.tsx     — Fixed bottom nav: Activities, Children, + Add
    Header.tsx        — Top header with gradient
    Toast.tsx         — Toast notification system
    VoiceRecordButton.tsx — Voice recording (legacy, may be unused)
  lib/
    firebase.ts       — Firestore client init (project clann-d9da7)
    family-store.ts   — Firestore-backed CRUD for children & activities, with localStorage cache and cross-device live sync via onSnapshot + a "family-sync" window event
    voice-parser.ts   — Local keyword fallback parser (no API needed)
    themes.ts         — Theme/colour definitions
```

## Data model (Firestore, project `clann-d9da7`)
- **children** collection: `{ id, name, age, initials, color }`
- **activities** collection: `{ id, childId, title, date, time, durationMinutes, location?, notes?, recurring?, owner? }`
- **settings/family** doc: `{ name }` — the family name shown in the header
- Firestore rules (`firestore.rules`) allow open read/write — there's no auth system, it's a shared family app
- Demo data: Emma-Louise (12), Aedy (10), Jane (8) with sample weekend activities (used as fallback before first Firestore snapshot arrives)

## Design
- **Colour scheme**: violet-pink-amber gradient (`#8b5cf6` → `#ec4899` → `#f59e0b`)
- **Font**: system font stack
- **Bottom nav**: 3 items — Activities (⌂), Children (●), Add (+)
- **Cards**: rounded-2xl with subtle borders and shadows

## Voice input
The `/api/parse-voice` route uses Claude Haiku to parse natural language into activity records. It requires `ANTHROPIC_API_KEY` in Vercel env vars. Without the key, the app falls back to `voice-parser.ts` (local keyword matching). The SDK is lazy-loaded at request time (not import time) to avoid build failures.

## Environment variables (Vercel)
- `ANTHROPIC_API_KEY` — optional, for smart voice parsing
