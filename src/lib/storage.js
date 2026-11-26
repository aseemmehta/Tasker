/* Storage backends: browser cache (default), a local JSON file (Chrome/Edge), or Google Drive. */
import { CLIENT_ID } from '../config.js';
import { clean, merge, uid, now } from './data.js';

/** Thrown when the user has to sign in / grant access again. */
export class NeedAuth extends Error {}

const LS = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};
export { LS };

/* Browser cache. Same key as the old single-file version, so existing data carries over. */
export const Store = {
  key: 'session-ledger.v1',
  load() { try { return JSON.parse(localStorage.getItem(this.key)); } catch (e) { return null; } },
  save(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); return true; } catch (e) { return false; } },
};

/* Optional file backend: a data file inside your synced Drive folder (desktop Chrome/Edge). */
export const FT = { types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] };

export const FS = {
  ok: typeof window !== 'undefined' && 'showSaveFilePicker' in window,
  h: null, q: null, seen: 0, busy: 0,
  db() {
    return new Promise((r, j) => {
      const q = indexedDB.open('sl', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('k');
      q.onsuccess = () => r(q.result);
      q.onerror = j;
    });
  },
  async put(h) { (await this.db()).transaction('k', 'readwrite').objectStore('k').put(h, 'h'); },
  async get() {
    const db = await this.db();
    return new Promise(r => {
      const q = db.transaction('k').objectStore('k').get('h');
      q.onsuccess = () => r(q.result);
      q.onerror = () => r(null);
    });
  },
  async forget() {
    try { (await this.db()).transaction('k', 'readwrite').objectStore('k').delete('h'); } catch (e) { /* ignore */ }
  },
  /** Reads the linked file. Returns cleaned data, or null if it is not a Session Ledger file. */
  async load() {
    const f = await this.h.getFile();
    const c = clean(JSON.parse(await f.text()));
    if (!c) return null;
    this.seen = f.lastModified;
    return c;
  },
  /** getD returns the latest data when the write actually runs; apply(next) adopts merged data. */
  write(getD, apply) {
    this.q = (this.q || Promise.resolve()).catch(() => {}).then(async () => {
      this.busy = 1;
      try {
        const f = await this.h.getFile();
        if (this.seen && f.lastModified !== this.seen) {
          try { apply(merge(getD(), JSON.parse(await f.text()))); } catch (e) { /* keep ours */ }
        }
        const w = await this.h.createWritable();
        await w.write(JSON.stringify(getD(), null, 1));
        await w.close();
        this.seen = (await this.h.getFile()).lastModified;
      } finally { this.busy = 0; }
    });
    return this.q;
  },
  /** Returns newer data from the file, or null if nothing changed. */
  async pull() {
    const f = await this.h.getFile();
    if (f.lastModified === this.seen) return null;
    const c = clean(JSON.parse(await f.text()));
    if (!c) return null;
    this.seen = f.lastModified;
    return c;
  },
};

/* Google Drive backend: works in any modern browser. Needs an OAuth client ID and a page served over https. */
const API = 'https://www.googleapis.com/drive/v3/files';
const UP = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_NAME = 'session-ledger-data.json';

export const GD = {
  cid: LS.get('sl-cid') || CLIENT_ID,
  on: LS.get('sl-mode') === 'drive',
  fid: LS.get('sl-fid'),
  tok: '', exp: 0, seen: '', busy: 0, q: null, ready: false,

  lib() {
    return new Promise((r, j) => {
      if (window.google && window.google.accounts) return r();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = r;
      s.onerror = () => j(new Error('Could not load Google sign-in'));
      document.head.appendChild(s);
    });
  },
  async auth(interactive) {
    if (this.tok && now() < this.exp) return;
    if (!interactive) throw new NeedAuth('Signed out of Google');
    if (!this.cid) throw new Error('Add your Google client ID in Settings');
    await this.lib();
    await new Promise((r, j) => {
      window.google.accounts.oauth2
        .initTokenClient({
          client_id: this.cid,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: x => {
            if (x.error) return j(new Error(x.error));
            this.tok = x.access_token;
            this.exp = now() + (x.expires_in - 60) * 1000;
            r();
          },
          error_callback: e => j(new Error(e.type || 'Sign-in cancelled')),
        })
        .requestAccessToken({ prompt: this.fid ? '' : 'consent' });
    });
  },
  async api(url, o = {}) {
    await this.auth(false);
    const r = await fetch(url, { ...o, headers: { ...(o.headers || {}), Authorization: 'Bearer ' + this.tok } });
    if (r.status === 401) { this.tok = ''; throw new NeedAuth('Signed out of Google'); }
    if (!r.ok) throw new Error('Drive error ' + r.status);
    return r;
  },
  async meta() { return (await (await this.api(`${API}/${this.fid}?fields=modifiedTime`)).json()).modifiedTime; },
  async read() { return (await this.api(`${API}/${this.fid}?alt=media`)).json(); },
  async create(local) {
    const b = 'sl' + uid();
    const body = [
      `--${b}`, 'Content-Type: application/json', '',
      JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' }),
      `--${b}`, 'Content-Type: application/json', '',
      JSON.stringify(local),
      `--${b}--`,
    ].join('\r\n');
    const r = await (await this.api(`${UP}?uploadType=multipart&fields=id,modifiedTime`, {
      method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body,
    })).json();
    this.fid = r.id;
    LS.set('sl-fid', r.id);
    this.seen = r.modifiedTime;
  },
  /** Finds (or creates) the data file. Returns the data found in Drive, or null if a new file was created from `local`. */
  async load(local) {
    if (this.fid) {
      try { await this.meta(); } catch (e) { if (e instanceof NeedAuth) throw e; this.fid = null; }
    }
    if (!this.fid) {
      const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
      const r = await (await this.api(`${API}?q=${q}&fields=files(id)`)).json();
      if (r.files[0]) { this.fid = r.files[0].id; LS.set('sl-fid', this.fid); }
    }
    if (this.fid) {
      const c = clean(await this.read());
      this.seen = await this.meta();
      return c;
    }
    await this.create(local);
    return null;
  },
  write(getD, apply) {
    this.q = (this.q || Promise.resolve()).catch(() => {}).then(async () => {
      this.busy = 1;
      try {
        const m = await this.meta();
        if (this.seen && m !== this.seen) apply(merge(getD(), await this.read()));
        const r = await (await this.api(`${UP}/${this.fid}?uploadType=media&fields=modifiedTime`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getD()),
        })).json();
        this.seen = r.modifiedTime;
      } finally { this.busy = 0; }
    });
    return this.q;
  },
  /** Returns newer data from Drive, or null if nothing changed. */
  async pull() {
    const m = await this.meta();
    if (m === this.seen) return null;
    const c = clean(await this.read());
    if (!c) return null;
    this.seen = m;
    return c;
  },
};

export const backend = () => (GD.on ? GD : FS.h ? FS : null);
export const backendName = () => (GD.on ? 'Google Drive' : FS.h.name);
