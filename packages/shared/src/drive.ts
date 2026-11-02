import { clean, merge, seed, type Data } from './model';

declare const google: any;
const API = 'https://www.googleapis.com/drive/v3/files';
const UP = 'https://www.googleapis.com/upload/drive/v3/files';

/** One JSON file in the signed-in user's Drive. Only the drive.file scope: the app can see just the files it created. */
export class DriveStore {
  private tok = ''; private exp = 0; private seen = '';
  private fid: string | null;
  private q: Promise<unknown> = Promise.resolve();
  constructor(private clientId: string, private fileName: string) { this.fid = localStorage.getItem('fid:' + fileName); }

  get signedIn() { return !!this.tok && Date.now() < this.exp; }

  private lib() {
    return new Promise<void>((ok, bad) => {
      if ((window as any).google?.accounts) return ok();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.onload = () => ok(); s.onerror = () => bad(new Error('Could not load Google sign-in'));
      document.head.appendChild(s);
    });
  }

  /** Call from a click handler: the Google popup needs a user gesture. The token stays in memory only. */
  async signIn() {
    if (!this.clientId) throw new Error('Add your Google client ID in src/config.ts');
    await this.lib();
    await new Promise<void>((ok, bad) => google.accounts.oauth2.initTokenClient({
      client_id: this.clientId, scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (r: any) => { if (r.error) return bad(new Error(r.error)); this.tok = r.access_token; this.exp = Date.now() + (r.expires_in - 60) * 1000; ok(); },
      error_callback: (e: any) => bad(new Error(e?.type || 'Sign-in cancelled')),
    }).requestAccessToken({ prompt: this.fid ? '' : 'consent' }));
  }

  signOut() { if (this.tok) google.accounts.oauth2.revoke(this.tok); this.tok = ''; }

  private async api(url: string, o: RequestInit = {}) {
    if (!this.signedIn) throw new Error('Signed out of Google');
    const r = await fetch(url, { ...o, headers: { ...(o.headers || {}), Authorization: 'Bearer ' + this.tok } });
    if (r.status === 401) this.tok = '';
    if (!r.ok) throw new Error('Drive error ' + r.status);
    return r;
  }
  private async meta(): Promise<string> { return (await (await this.api(`${API}/${this.fid}?fields=modifiedTime`)).json()).modifiedTime; }
  private async read(): Promise<unknown> { return (await this.api(`${API}/${this.fid}?alt=media`)).json(); }

  private async create(d: Data) {
    const b = 'b' + crypto.randomUUID();
    const body = [`--${b}`, 'Content-Type: application/json', '', JSON.stringify({ name: this.fileName, mimeType: 'application/json' }),
      `--${b}`, 'Content-Type: application/json', '', JSON.stringify(d), `--${b}--`].join('\r\n');
    const r = await (await this.api(`${UP}?uploadType=multipart&fields=id,modifiedTime`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body })).json();
    this.fid = r.id; localStorage.setItem('fid:' + this.fileName, r.id); this.seen = r.modifiedTime;
  }

  /** Finds (or creates) the file and returns its cleaned contents. */
  async load(): Promise<Data> {
    if (this.fid) { try { await this.meta(); } catch (e) { if (!this.signedIn) throw e; this.fid = null; } }
    if (!this.fid) {
      const q = encodeURIComponent(`name='${this.fileName}' and trashed=false`);
      const r = await (await this.api(`${API}?q=${q}&fields=files(id)`)).json();
      if (r.files[0]) { this.fid = r.files[0].id; localStorage.setItem('fid:' + this.fileName, this.fid!); }
    }
    if (!this.fid) { const d = seed(); await this.create(d); return d; }
    const d = clean(await this.read()) ?? seed();
    this.seen = await this.meta();
    return d;
  }

  /** Saves in order. If another device wrote first, merges and returns the merged data. */
  save(d: Data): Promise<Data> {
    const run = async () => {
      let out = d;
      const m = await this.meta();
      if (this.seen && m !== this.seen) out = merge(d, await this.read());
      const r = await (await this.api(`${UP}/${this.fid}?uploadType=media&fields=modifiedTime`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out) })).json();
      this.seen = r.modifiedTime;
      return out;
    };
    const p = this.q.catch(() => {}).then(run);
    this.q = p;
    return p;
  }

  /** Returns fresh data if another device changed the file, otherwise null. */
  async pull(): Promise<Data | null> {
    const m = await this.meta();
    if (m === this.seen) return null;
    const d = clean(await this.read());
    if (d) this.seen = m;
    return d;
  }
}
