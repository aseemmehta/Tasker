// Google OAuth client ID (public by design). Never put a client secret in this repo.
// It can also be overridden at runtime in Settings > Data.
export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
