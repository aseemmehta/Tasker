/* Google Analytics 4, loaded only after the visitor accepts.
 *
 * - No GA code or network request happens before consent.
 * - No user id, no Google sign-in link, no task data: only page views with a fixed title and a URL without
 *   query string or hash.
 * - Google signals and ad personalisation are switched off.
 * - The choice is stored in this browser only (key below) and can be changed any time in Settings.
 */
import { GA_ID } from '../config.js';

const KEY = 'sl-consent-ga';               // 'granted' | 'denied' | absent = not asked yet
const SRC = 'https://www.googletagmanager.com/gtag/js';

const listeners = new Set();
let loaded = false;

const read = () => {
  try { return localStorage.getItem(KEY); } catch (e) { return null; }
};
const write = v => {
  try { localStorage.setItem(KEY, v); } catch (e) { /* choice just won't persist */ }
};

/** True when a valid measurement ID was supplied at build time. */
export const analyticsConfigured = /^G-[A-Z0-9]{4,}$/.test(GA_ID);

/** 'granted', 'denied' or null (not asked yet). Always null when analytics is not configured. */
export const getConsent = () => {
  if (!analyticsConfigured) return null;
  const v = read();
  return v === 'granted' || v === 'denied' ? v : null;
};

export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => listeners.forEach(fn => fn());

/* Page URL without query string or hash, so nothing but the path is ever sent. */
const cleanUrl = () => location.origin + location.pathname;

function load() {
  if (loaded || !analyticsConfigured) return;
  loaded = true;
  window['ga-disable-' + GA_ID] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); }; // GA needs the arguments object, not an array
  window.gtag('js', new Date());
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('config', GA_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: cleanUrl(),
    page_title: 'Session Ledger',
    page_referrer: '',
  });
  const s = document.createElement('script');
  s.async = true;
  s.src = SRC + '?id=' + encodeURIComponent(GA_ID);
  document.head.appendChild(s);
}

function clearCookies() {
  const host = location.hostname;
  document.cookie.split(';').forEach(c => {
    const name = c.split('=')[0].trim();
    if (name === '_ga' || name.startsWith('_ga_') || name === '_gid') {
      [host, '.' + host, ''].forEach(d => {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    }
  });
}

/** Visitor accepted: remember it and start GA. */
export function accept() {
  if (!analyticsConfigured) return;
  write('granted');
  if (loaded && window.gtag) {
    window['ga-disable-' + GA_ID] = false;
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
  } else load();
  notify();
}

/** Visitor declined or withdrew: remember it, stop sending, remove GA cookies. */
export function decline() {
  write('denied');
  if (analyticsConfigured) {
    window['ga-disable-' + GA_ID] = true;
    if (loaded && window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
    clearCookies();
  }
  notify();
}

/** Call once at start-up: if the visitor accepted earlier, load GA again. */
export function initAnalytics() {
  if (getConsent() === 'granted') load();
}
