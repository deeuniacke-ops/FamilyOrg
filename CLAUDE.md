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
    layout.tsx        — Root layout, just renders <FamilyGate>
    manage/page.tsx   — Manage children, activities, family name, and "leave family"
    add/page.tsx      — Add activity (with voice input option)
    api/parse-voice/  — Claude API route for smart voice parsing
    globals.css       — Tailwind + custom utilities
  components/
    FamilyGate.tsx    — Join screen (family name + passphrase) gating the whole app; renders Header/BottomNav/Toast once joined
    BottomNav.tsx     — Fixed bottom nav: Activities, Children, + Add
    Header.tsx        — Top header with gradient, shows the family's display name
    Toast.tsx         — Toast notification system
    VoiceRecordButton.tsx — Voice recording (legacy, may be unused)
  lib/
    firebase.ts       — Firestore client init (project clann-d9da7)
    family-id.ts       — Derives a family's namespace ID (SHA-256 of name+passphrase) and stores it in localStorage; leaveFamily() clears it
    family-store.ts   — Firestore-backed CRUD for children & activities, scoped to families/{familyId}; localStorage cache + cross-device live sync via onSnapshot + a "family-sync" window event. Must call initFamilySync(familyId) before any other function is used
    voice-parser.ts   — Local keyword fallback parser (no API needed)
    themes.ts         — Theme/colour definitions
```

## Multi-family model — no real accounts, no login page
Multiple independent families (e.g. two different households) share the
same deployed app with **completely separate data**, without any real
authentication system:
- On first load, `FamilyGate` asks for a **family name + shared passphrase**
- `familyId = SHA256(name.toLowerCase() + "::" + passphrase)` (see `family-id.ts`)
- All Firestore reads/writes for that browser go to `families/{familyId}/...`
- The ID is stored in localStorage so the device only asks once
- Anyone who enters the same name+passphrase joins the same family; anyone
  else gets a distinct, empty family space
- There is **no password reset, no server-side account list, no per-user
  identity** — security is "you can't derive the ID without knowing the
  secret." That's an intentional, appropriate tradeoff for a small
  personal app shared between trusted households, not real auth.
- New/empty families start with genuinely no children or activities — there's
  no demo data seeding anymore (removed because it made no sense once
  multiple unrelated families exist)

## Data model (Firestore, project `clann-d9da7`)
- `families/{familyId}/children/{childId}`: `{ id, name, age, initials, color }`
- `families/{familyId}/activities/{activityId}`: `{ id, childId, title, date, time, durationMinutes, location?, notes?, recurring?, owner? }`
- `families/{familyId}/settings/family`: `{ name }` — the family name shown in the header
- Firestore rules (`firestore.rules`) allow open read/write **within** a given `familyId` path — there's no per-user auth, isolation comes entirely from not knowing another family's ID

## Design
- **Colour scheme**: violet-pink-amber gradient (`#8b5cf6` → `#ec4899` → `#f59e0b`)
- **Font**: system font stack
- **Bottom nav**: 3 items — Activities (⌂), Children (●), Add (+)
- **Cards**: rounded-2xl with subtle borders and shadows

## Voice input
The `/api/parse-voice` route uses Claude Haiku to parse natural language into activity records. It requires `ANTHROPIC_API_KEY` in Vercel env vars. Without the key, the app falls back to `voice-parser.ts` (local keyword matching). The SDK is lazy-loaded at request time (not import time) to avoid build failures.

## Environment variables (Vercel)
- `ANTHROPIC_API_KEY` — optional, for smart voice parsing
