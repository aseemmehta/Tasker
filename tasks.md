# Tasker (public repo): Tasks

Last updated: 27 Nov 2026
Related: `apps-backend` (private, Cloudflare Worker + D1), `apps-local` (private, laptop export)

## Done
- [x] Convert single `index.html` to React + Vite
- [x] Storage options: browser cache, local JSON file, Google Drive (`drive.file`)
- [x] GitHub Pages deploy via GitHub Actions
- [x] Docker (dev and prod) with configurable host ports
- [x] Google client ID passed at build time from GitHub secret
- [x] Google sign-in fixed

## Phase 1: GA4 with consent
- [ ] Create GA4 property and get measurement ID (manual, see steps)
- [x] Pass `VITE_GA_MEASUREMENT_ID` in the Build step (code done; still add the `GA_MEASUREMENT_ID` secret in GitHub, manual)
- [x] Consent banner (GA loads only after accept; choice remembered and changeable)
- [x] No user identifiers sent to GA
- [x] Update CSP for GA domains

## Phase 2 (frontend side only)
- [ ] Add API URL as public build variable
- [ ] Add API domain to CSP
- [ ] Copy `API.md` from `apps-backend` into `docs/API.md`

## Phase 3: Opt-in sharing + leaderboard tab
- [ ] Opt-in toggle (off by default) with clear list of shared fields
- [ ] Display name field
- [ ] Send weekly summary to the API
- [ ] Leaderboard tab: % goals completed
- [ ] Leaderboard tab: time on goals
- [ ] Qualification rule (min 3 goals) as a constant
- [ ] k-anonymity (5+ users) on any popularity board
- [ ] "Delete my data" button
- [ ] Graceful behaviour when backend is down or signed out

## Docker
- [x] Compose host ports now read `DEV_PORT` / `PROD_PORT` from `.env` (defaults 5273 / 8180); `.env` git-ignored, `.env.example` added
- [ ] Existing Docker setup still works after each phase (Phase 1: please run `docker compose up --build` once)

## Decisions
- GA ID is validated (`G-XXXX`); empty ID = no banner, no GA code
- CSP: GA script limited to the `gtag/js` path; connect/img limited to Google Analytics hosts

## Notes
- The uploaded zip had hard-coded ports 5273/8080 in compose; fixed to match the `.env` setup described in the prompt
- No secrets, backend code or exported data in this repo.
