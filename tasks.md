# Tasker (public repo): Tasks

Last updated: 28 Nov 2026 (legal pages added)
Related: `apps-backend` (private, Cloudflare Worker + D1), `apps-local` (private, laptop export)

## Done
- [x] Convert single `index.html` to React + Vite
- [x] Storage options: browser cache, local JSON file, Google Drive (`drive.file`)
- [x] GitHub Pages deploy via GitHub Actions
- [x] Docker (dev and prod) with configurable host ports
- [x] Google client ID passed at build time from GitHub secret
- [x] Google sign-in fixed

## Phase 1: GA4 with consent (done 28 Nov 2026)
- [x] Create GA4 property and get measurement ID
- [x] Add `GA_MEASUREMENT_ID` GitHub secret and pass it in the Build step
- [x] Consent banner (GA loads only after accept; choice remembered and changeable in Settings > Privacy)
- [x] No user identifiers sent to GA
- [x] Update CSP for GA domains
- [x] Checked locally (dev and prod build) and live on GitHub Pages; page hits visible in GA4
- [ ] GA4 Admin: Google signals off, event data retention 2 months, stream URL = `github.io` origin (deferred by choice, do later)
- [x] GitHub repo: secret scanning and push protection on
- [ ] Optional, maybe later: treat Do Not Track / Global Privacy Control as an automatic decline

## Google OAuth: publish consent screen
- [ ] Replace `[YOUR NAME]` / `[CONTACT EMAIL]` in `public/privacy.html` and `public/terms.html`
- [ ] Deploy, then check `<site>/privacy.html` and `<site>/terms.html` open (no login)
- [ ] Google Auth Platform > Branding: app name, support email, developer contact, privacy and terms links
- [ ] Data Access: confirm only non-sensitive scopes (`drive.file`)
- [ ] Audience > Publish app; test Drive connect with a non-test-user account
- [ ] Authorized JS origins: `http://localhost:5273`, `http://localhost:8180`, `https://<user>.github.io`

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
- [x] Compose host ports read `DEV_PORT` / `PROD_PORT` from `.env` (defaults 5273 / 8180); `.env` git-ignored, `.env.example` added
- [x] Prod image gets public build values (`VITE_GOOGLE_CLIENT_ID`, `VITE_GA_MEASUREMENT_ID`) as compose build args; `.env` kept out of the image
- [ ] Existing Docker setup still works after each phase (Phase 1: verified)

## Decisions
- GA ID is validated (`G-XXXX`); empty ID = no banner, no GA code
- CSP: GA script limited to the `gtag/js` path; connect/img limited to Google Analytics hosts
- Empty `VITE_GA_MEASUREMENT_ID` in local `.env` keeps test visits out of the GA property

## Notes
- No secrets, backend code or exported data in this repo.
- The `/.well-known/appspecific/com.chrome.devtools.json` CSP message in the prod build Console is Chrome DevTools probing; harmless.
- Google OAuth origins to keep registered: `http://localhost:5273`, `http://localhost:8180`, `https://<user>.github.io`.
