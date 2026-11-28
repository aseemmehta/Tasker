# Tasker (Session Ledger)

A small time tracker for repeatable tasks: start/stop sessions, fix times, set daily or weekly goals, and see totals,
streaks and charts. Data lives in your browser, a local JSON file (Chrome/Edge), or Google Drive.

Built with React + Vite and deployed to GitHub Pages by GitHub Actions.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5273
npm run build      # production build into dist/
npm run preview    # serve dist/ locally
```

Needs Node 18 or newer.

Copy `.env.example` to `.env` (git-ignored) to set the Docker host ports (`DEV_PORT`, `PROD_PORT`) and the public
build values `VITE_GOOGLE_CLIENT_ID` and `VITE_GA_MEASUREMENT_ID`.

### With Docker

```bash
docker compose up --build                 # dev server with hot reload: http://localhost:5273
docker compose --profile prod up --build  # production build served by nginx: http://localhost:8180
```

For Google Drive sign-in while testing, add `http://localhost:5273` (and `http://localhost:8180`) to the OAuth
client's **Authorized JavaScript origins**.

## Deploy (GitHub Pages)

1. Repo **Settings > Pages > Build and deployment > Source: GitHub Actions**. (Leave it on "Deploy from a branch" and
   GitHub runs its own "pages build and deployment" job, which publishes the raw source instead of the built app.)
2. Commit `package-lock.json` after the first `npm install`.
3. Push to `main`. The **Deploy to GitHub Pages** workflow builds and publishes the site. You can also run it by hand
   from the **Actions** tab.

The app is then at `https://<user>.github.io/<repo>/`.

## Analytics (Google Analytics 4, opt-in)

Set `VITE_GA_MEASUREMENT_ID` (GitHub secret `GA_MEASUREMENT_ID`) to enable it; leave it empty and no banner or GA code
exists. GA loads only after the visitor clicks **Allow**; the choice is stored in the browser and can be changed in
**Settings > Privacy**. Only page views are sent: no user ID, no link to Google sign-in, no task data, no query string
or hash in the URL. Google signals and ad personalisation are off.

## Google Drive sync

The OAuth client ID in `src/config.js` is public by design. In Google Cloud Console, the client's **Authorized
JavaScript origins** must include `https://<user>.github.io`. Never commit a client secret.

## Project layout

```
index.html              Vite entry
src/main.jsx            React entry
src/App.jsx             state, actions, storage wiring
src/components/         Dashboard, Settings, shared pieces
src/lib/data.js         data model, validation, metrics
src/lib/storage.js      browser cache, local file and Google Drive backends
src/lib/analytics.js    GA4, loaded only after consent
src/components/Consent.jsx  consent banner and Privacy settings
.github/workflows/      deploy.yml
```
