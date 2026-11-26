import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Content-Security-Policy, added to the built page only (the dev server needs inline scripts).
const CSP = [
  "script-src 'self' https://accounts.google.com/gsi/client",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  'connect-src https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com/gsi/',
  'frame-src https://accounts.google.com/gsi/',
].join('; ');

const csp = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
});

export default defineConfig({
  // Relative asset paths: works at https://<user>.github.io/<repo>/ whatever the repo is called.
  base: './',
  plugins: [react(), csp()],
});
