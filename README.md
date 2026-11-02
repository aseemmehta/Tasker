# Tasker

- `apps/home` landing page, `apps/time` Time Tracker (React + TypeScript), `packages/shared` Drive storage, data cleaning and merge.
- `legacy/` the original single-file tracker, still served at `/legacy/` until the port is complete.

## First run
1. `npm install` (creates `package-lock.json`; commit it, CI uses `npm ci`).
2. Put your Google OAuth client ID in `apps/time/src/config.ts` (public by design; never commit a client secret).
3. `npm run dev:time` for local work, `npm run build` to produce `site/`.
