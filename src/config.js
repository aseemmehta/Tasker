// Public build-time values. Nothing in this file is secret, and no secret may ever be added here.

// Google OAuth client ID (public by design). Never put a client secret in this repo.
// It can also be overridden at runtime in Settings > Data.
export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Google Analytics 4 measurement ID (public by design, e.g. G-XXXXXXXXXX). Empty = analytics disabled.
export const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
