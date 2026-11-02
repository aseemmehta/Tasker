import react from '@vitejs/plugin-react';
// Strict policy applied to production builds only (the dev server needs inline scripts).
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com/gsi/client",
  "style-src 'self' https://accounts.google.com/gsi/style",
  "img-src 'self' data:",
  "connect-src https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com/gsi/",
  "frame-src https://accounts.google.com/gsi/",
  "object-src 'none'", "base-uri 'none'", "form-action 'none'",
].join('; ');
export const cfg = () => ({
  base: './',
  plugins: [react(), { name: 'csp', apply: 'build', transformIndexHtml: (h) => h.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${CSP}">`) }],
});
