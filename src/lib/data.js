/* Data model, validation and metrics. Pure functions, no DOM. */

export const uid = () => Math.random().toString(36).slice(2, 9);
export const GU = ['min/day', 'hour/day', 'min/week', 'hour/week'];

export function seed() {
  const d = uid();
  return { v: 1, cur: d, tasks: [], dashes: [{ id: d, name: 'My dashboard', desc: '', tasks: [] }] };
}

/* Every load path (file, Drive, import, cache) runs through clean(): unexpected shapes, ids and numbers are dropped. */
const OK = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(s);
const TX = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');
const NM = n => (Number.isFinite(n) ? n : 0);

export function clean(j) {
  if (!j || !Array.isArray(j.tasks) || !Array.isArray(j.dashes)) return null;
  const tasks = j.tasks.filter(t => t && OK(t.id)).map(t => ({
    id: t.id,
    name: TX(t.name, 100) || 'Untitled',
    desc: TX(t.desc, 500),
    gv: Math.max(0, NM(+(t.gv !== undefined ? t.gv : t.goal))),
    gu: GU.includes(t.gu) ? t.gu : 'min/day',
    arch: !!t.arch,
    s: (Array.isArray(t.s) ? t.s : [])
      .filter(x => x && OK(x.id) && Number.isFinite(x.s) && (x.e == null || Number.isFinite(x.e)))
      .map(x => ({ id: x.id, s: x.s, e: x.e == null ? null : x.e })),
  }));
  const ids = new Set(tasks.map(t => t.id));
  const dashes = j.dashes.filter(d => d && OK(d.id)).map(d => ({
    id: d.id,
    name: TX(d.name, 100) || 'Untitled',
    desc: TX(d.desc, 500),
    tasks: (Array.isArray(d.tasks) ? d.tasks : []).filter(i => ids.has(i)),
  }));
  return { v: 1, cur: dashes.some(d => d.id === j.cur) ? j.cur : (dashes[0] || {}).id, tasks, dashes };
}

/* Another browser wrote the file between our read and write: keep our changes, add anything we have not seen.
   Returns a new object; the input is not modified. */
export function merge(local, remote) {
  const R = clean(remote);
  if (!R) return local;
  const D = structuredClone(local);
  R.tasks.forEach(rt => {
    const t = D.tasks.find(x => x.id === rt.id);
    if (!t) D.tasks.push(rt);
    else
      rt.s.forEach(x => {
        const y = t.s.find(z => z.id === x.id);
        if (!y) t.s.push(x);
        else if (!y.e && x.e) y.e = x.e;
      });
  });
  R.dashes.forEach(rd => {
    if (!D.dashes.find(d => d.id === rd.id)) D.dashes.push(rd);
  });
  return D;
}

/* ---- time helpers ---- */
export const now = () => Date.now();
export const p2 = n => String(n).padStart(2, '0');
export const dk = t => {
  const d = new Date(t);
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
};
export const dur = x => (x.e || now()) - x.s;
export const clk = ms => {
  const s = Math.floor(ms / 1000);
  return p2(Math.floor(s / 3600)) + ':' + p2(Math.floor(s / 60) % 60) + ':' + p2(s % 60);
};
export const hm = ms => {
  const m = Math.round(ms / 60000);
  return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm';
};
export const loc = t => {
  const d = new Date(t);
  return dk(t) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes());
};
export const tm = t => {
  const d = new Date(t);
  return p2(d.getHours()) + ':' + p2(d.getMinutes());
};
export function wk(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/* ---- task helpers ---- */
export const running = t => t.s.find(x => !x.e);
const sum = (t, pred) => t.s.filter(pred).reduce((a, x) => a + dur(x), 0);
export const totalMs = t => sum(t, () => true);
export const todayMs = t => sum(t, x => dk(x.s) === dk(now()));
export const weekMs = t => {
  const k = dk(wk(now()));
  return sum(t, x => dk(wk(x.s)) === k);
};
export const goalInfo = t => {
  if (!t.gv) return null;
  const u = t.gu || 'min/day';
  const w = u.endsWith('week');
  const ms = t.gv * (u.startsWith('hour') ? 3600000 : 60000);
  return { ms, w, done: w ? weekMs(t) : todayMs(t) };
};

/* ---- metrics ---- */
export function bucketKey(r, ts) {
  if (r === 'day') return dk(ts);
  if (r === 'week') return dk(wk(ts));
  const d = new Date(ts);
  return d.getFullYear() + '-' + p2(d.getMonth() + 1);
}

export function buckets(r) {
  const out = [];
  const n = new Date();
  if (r === 'day')
    for (let i = 6; i >= 0; i--) {
      const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() - i);
      out.push({ k: dk(d), l: d.toLocaleDateString(undefined, { weekday: 'short' }) });
    }
  else if (r === 'week')
    for (let i = 7; i >= 0; i--) {
      const d = wk(n);
      d.setDate(d.getDate() - 7 * i);
      out.push({ k: dk(d), l: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) });
    }
  else
    for (let i = 5; i >= 0; i--) {
      const d = new Date(n.getFullYear(), n.getMonth() - i, 1);
      out.push({ k: d.getFullYear() + '-' + p2(d.getMonth() + 1), l: d.toLocaleDateString(undefined, { month: 'short' }) });
    }
  return out;
}

export function streak(t) {
  const days = new Set(t.s.filter(x => dur(x) > 0).map(x => dk(x.s)));
  const d = new Date();
  d.setHours(12);
  if (!days.has(dk(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dk(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return { n, total: days.size };
}

export function goalStat(t) {
  const g = goalInfo(t);
  if (!g) return ['–', 'no goal set'];
  let c = 0;
  const n = new Date();
  if (!g.w) {
    for (let i = 0; i < 7; i++) {
      const k = dk(new Date(n.getFullYear(), n.getMonth(), n.getDate() - i));
      if (sum(t, x => dk(x.s) === k) >= g.ms) c++;
    }
    return [c + '/7', 'goal met, last 7 days'];
  }
  for (let i = 0; i < 4; i++) {
    const d = wk(n);
    d.setDate(d.getDate() - 7 * i);
    const k = dk(d);
    if (sum(t, x => dk(wk(x.s)) === k) >= g.ms) c++;
  }
  return [c + '/4', 'goal met, last 4 weeks'];
}
