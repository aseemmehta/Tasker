export type Session = { id: string; s: number; e: number | null };
export const GOAL_UNITS = ['min/day', 'hour/day', 'min/week', 'hour/week'] as const;
export type GoalUnit = (typeof GOAL_UNITS)[number];
export type Task = { id: string; name: string; desc: string; gv: number; gu: GoalUnit; arch: boolean; s: Session[] };
export type Dash = { id: string; name: string; desc: string; tasks: string[] };
export type Data = { v: 1; cur?: string; tasks: Task[]; dashes: Dash[] };

export const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);
export const seed = (): Data => { const id = uid(); return { v: 1, cur: id, tasks: [], dashes: [{ id, name: 'My dashboard', desc: '', tasks: [] }] }; };

const okId = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(s);
const text = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '');
const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : null);

/** Rebuilds untrusted JSON (Drive, file, import) into a safe Data object, or null if it is not one. */
export function clean(j: any): Data | null {
  if (!j || !Array.isArray(j.tasks) || !Array.isArray(j.dashes)) return null;
  const tasks: Task[] = j.tasks.filter((t: any) => t && okId(t.id)).map((t: any) => ({
    id: t.id, name: text(t.name, 100) || 'Untitled', desc: text(t.desc, 500),
    gv: Math.max(0, num(+(t.gv ?? t.goal)) ?? 0),
    gu: (GOAL_UNITS as readonly string[]).includes(t.gu) ? t.gu : 'min/day', arch: !!t.arch,
    s: (Array.isArray(t.s) ? t.s : []).filter((x: any) => x && okId(x.id) && num(x.s) !== null && (x.e == null || num(x.e) !== null))
      .map((x: any) => ({ id: x.id, s: x.s, e: x.e ?? null })),
  }));
  const ids = new Set(tasks.map((t) => t.id));
  const dashes: Dash[] = j.dashes.filter((d: any) => d && okId(d.id)).map((d: any) => ({
    id: d.id, name: text(d.name, 100) || 'Untitled', desc: text(d.desc, 500),
    tasks: (Array.isArray(d.tasks) ? d.tasks : []).filter((i: string) => ids.has(i)),
  }));
  return { v: 1, cur: dashes.some((d) => d.id === j.cur) ? j.cur : dashes[0]?.id, tasks, dashes };
}

/** Union merge used when another device wrote in between: our changes win, we only add what we have not seen. */
export function merge(ours: Data, theirsRaw: unknown): Data {
  const theirs = clean(theirsRaw);
  if (!theirs) return ours;
  const out = structuredClone(ours);
  for (const rt of theirs.tasks) {
    const t = out.tasks.find((x) => x.id === rt.id);
    if (!t) { out.tasks.push(rt); continue; }
    for (const x of rt.s) {
      const y = t.s.find((z) => z.id === x.id);
      if (!y) t.s.push(x); else if (y.e === null && x.e !== null) y.e = x.e;
    }
  }
  for (const rd of theirs.dashes) if (!out.dashes.some((d) => d.id === rd.id)) out.dashes.push(rd);
  return out;
}

export const dur = (x: Session, now = Date.now()) => (x.e ?? now) - x.s;
export const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export const todayMs = (t: Task, now = Date.now()) => t.s.filter((x) => dayKey(x.s) === dayKey(now)).reduce((a, x) => a + dur(x, now), 0);
