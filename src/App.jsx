import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { clean, now, running, seed, uid } from './lib/data.js';
import { FS, FT, GD, LS, NeedAuth, Store, backend, backendName } from './lib/storage.js';
import { Dashboard } from './components/Dashboard.jsx';
import { Settings } from './components/Settings.jsx';
import { Banner, Dialog, Lock, StatusPill, Welcome } from './components/Misc.jsx';
import { ConsentBanner } from './components/Consent.jsx';

/* Actions that never need the data file, so they skip the "sign in again first" step. */
const NOGATE = new Set(['reconnect', 'unlink', 'gdconnect', 'theme', 'tab', 'chart', 'range', 'open', 'editses', 'canceledit', 'export', 'dlgno']);
const BAD_TIMES = 'Enter a start and an end time, with the end after the start.';

export default function App() {
  const [D, setD] = useState(() => clean(Store.load()) || seed());
  const Dref = useRef(D);
  const [tab, setTab] = useState('dash');
  const [range, setRange] = useState('day');
  const [chart, setChart] = useState('bar');
  const [openMap, setOpenMap] = useState({});
  const [edit, setEdit] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [boot, setBoot] = useState(true);
  const [err, setErr] = useState('');
  const [savedAt, setSavedAt] = useState(0);
  const [need, setNeedState] = useState(false);
  const [, rerender] = useReducer(x => x + 1, 0);
  const needRef = useRef(false);
  const bootRef = useRef(true);
  const setNeed = v => { needRef.current = v; setNeedState(v); };

  /* Replace the data (from a file, Drive or a merge). */
  const apply = useCallback(next => { Dref.current = next; setD(next); }, []);

  /* Write the current data to the active backend (or the browser cache). */
  const persist = useCallback(() => {
    const b = backend();
    const ok = b ? true : Store.save(Dref.current);
    setErr(ok ? '' : 'Not saved: storage unavailable');
    if (ok) setSavedAt(now());
    if (b && !needRef.current) {
      b.write(() => Dref.current, apply)
        .then(() => { setErr(''); setSavedAt(now()); })
        .catch(e => {
          if (e instanceof NeedAuth) { needRef.current = true; setNeedState(true); }
          setErr('Could not write data file');
        });
    }
  }, [apply]);

  /* Change the data: the callback edits a copy, which is then stored and saved. */
  const mutate = useCallback(fn => {
    const next = structuredClone(Dref.current);
    fn(next);
    apply(next);
    persist();
  }, [apply, persist]);

  /* ---- actions ---- */
  const A = {
    tab: () => setTab(t => (t === 'dash' ? 'set' : 'dash')),
    chart: () => setChart(c => (c === 'line' ? 'bar' : 'line')),
    range: r => setRange(r),
    open: id => setOpenMap(m => ({ ...m, [id]: !m[id] })),
    editses: sid => setEdit(sid),
    canceledit: () => setEdit(null),

    archive: id => mutate(d => {
      const t = d.tasks.find(x => x.id === id);
      t.arch = !t.arch;
      if (t.arch) { const r = running(t); if (r) r.e = now(); }
    }),
    toggle: id => mutate(d => {
      const t = d.tasks.find(x => x.id === id);
      const r = running(t);
      if (r) r.e = now(); else t.s.push({ id: uid(), s: now(), e: null });
    }),
    addses: (id, s, n, reset) => {
      if (s && n && n > s) { mutate(d => d.tasks.find(x => x.id === id).s.push({ id: uid(), s, e: n })); reset && reset(); }
      else setErr(BAD_TIMES);
    },
    saveses: (tid, sid, sv, ev, hadEnd) => {
      const s = new Date(sv).getTime();
      const n = ev ? new Date(ev).getTime() : 0;
      if (s && ((n && n > s) || (!ev && !hadEnd))) {
        mutate(d => { const x = d.tasks.find(t => t.id === tid).s.find(y => y.id === sid); x.s = s; x.e = n || null; });
        setEdit(null);
      } else setErr(BAD_TIMES);
    },
    delses: (tid, sid) => mutate(d => { const t = d.tasks.find(x => x.id === tid); t.s = t.s.filter(y => y.id !== sid); }),
    addtask: v => mutate(d => d.tasks.push({ id: uid(), name: v.name, gv: v.gv, gu: v.gu, desc: v.desc, arch: false, s: [] })),
    deltask: id => {
      const t = Dref.current.tasks.find(x => x.id === id);
      setDlg({
        title: 'Delete "' + t.name + '"?',
        msg: 'This permanently deletes the task and all ' + t.s.length + ' recorded sessions. It cannot be undone. Archiving keeps the history and only hides the task.',
        yes: 'Delete anyway',
        alt: t.arch ? '' : 'Archive instead',
        altFn: () => A.archive(id),
        fn: d => { d.tasks = d.tasks.filter(x => x.id !== id); d.dashes.forEach(x => (x.tasks = x.tasks.filter(i => i !== id))); },
      });
    },
    adddash: (name, desc) => mutate(d => { const x = { id: uid(), name, desc, tasks: [] }; d.dashes.push(x); if (!d.cur) d.cur = x.id; }),
    deldash: id => {
      const x = Dref.current.dashes.find(y => y.id === id);
      setDlg({
        title: 'Delete "' + x.name + '"?',
        msg: 'This permanently deletes the dashboard and cannot be undone. Dashboards cannot be archived. The tasks in it, and all their recorded time, are not deleted and stay available in Settings.',
        yes: 'Delete anyway',
        fn: d => { d.dashes = d.dashes.filter(y => y.id !== id); if (d.cur === id) d.cur = (d.dashes[0] || {}).id; },
      });
    },
    dlgno: () => setDlg(null),
    dlgyes: () => { const f = dlg.fn; setDlg(null); mutate(f); },
    dlgalt: () => { const f = dlg.altFn; setDlg(null); f(); },

    theme: () => {
      const r = document.documentElement;
      const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
      r.dataset.theme = dark ? 'light' : 'dark';
    },
    export: () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(Dref.current, null, 1)], { type: 'application/json' }));
      const t = new Date(), p = n => String(n).padStart(2, '0');
      a.download = 'session-ledger-' + t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()) + '.json';
      a.click();
    },

    /* ---- storage ---- */
    async mkfile() {
      try {
        FS.h = await window.showSaveFilePicker({ suggestedName: 'session-ledger-data.json', ...FT });
        await FS.put(FS.h).catch(() => {});
        GD.on = false; LS.set('sl-mode', null);
        setNeed(false);
        persist(); rerender();
      } catch (e) { setErr(e.name === 'AbortError' ? '' : 'File access is not available in this view'); rerender(); }
    },
    async openfile() {
      try {
        const [h] = await window.showOpenFilePicker(FT);
        FS.h = h;
        await FS.put(h).catch(() => {});
        GD.on = false; LS.set('sl-mode', null);
        setNeed(false);
        const c = await FS.load();
        if (!c) { FS.h = null; FS.forget(); setErr('Not a Session Ledger data file'); rerender(); return; }
        setErr('');
        apply(c); persist(); rerender();
      } catch (e) { setErr(e.name === 'AbortError' ? '' : 'Could not use that file'); rerender(); }
    },
    async reconnect() {
      if (GD.on) {
        try {
          await GD.auth(true);
          setNeed(false); setErr('');
          if (GD.ready) await GD.write(() => Dref.current, apply);
          else { const c = await GD.load(Dref.current); if (c) apply(c); GD.ready = true; }
        } catch (e) { setErr(e.message); }
        rerender();
        return;
      }
      try {
        if ((await FS.h.requestPermission({ mode: 'readwrite' })) === 'granted') {
          setNeed(false); setErr('');
          const c = await FS.load();
          if (c) apply(c);
          rerender();
        }
      } catch (e) { setErr('Could not read data file'); rerender(); }
    },
    async gdconnect() {
      if (!GD.cid) { setTab('set'); setErr('Add your Google client ID first'); return; }
      GD.on = true; LS.set('sl-mode', 'drive'); GD.fid = null; LS.set('sl-fid', null);
      try {
        await GD.auth(true);
        const c = await GD.load(Dref.current);
        if (c) apply(c);
        GD.ready = true; setErr(''); setNeed(false);
      } catch (e) { GD.on = false; LS.set('sl-mode', null); setErr(e.message); }
      rerender();
    },
    unlink: () => {
      if (GD.on && GD.tok && window.google && window.google.accounts) { try { window.google.accounts.oauth2.revoke(GD.tok); } catch (e) { /* ignore */ } }
      GD.tok = ''; GD.on = false; GD.ready = false; LS.set('sl-mode', null);
      FS.h = null; FS.forget();
      Store.save(Dref.current);
      setNeed(false); rerender();
    },
  };

  /* Wraps every button action: if the data file needs a sign-in first, ask for it before doing anything. */
  const run = async (name, ...args) => {
    if (needRef.current && backend() && !NOGATE.has(name)) {
      await A.reconnect();
      if (needRef.current) return;
    }
    return A[name](...args);
  };
  const act = {};
  Object.keys(A).forEach(k => (act[k] = (...a) => run(k, ...a)));

  /* Settings field changes (committed on blur / Enter). */
  const C = {
    cur: v => mutate(d => { d.cur = v; }),
    tname: (id, v) => mutate(d => { d.tasks.find(t => t.id === id).name = v || 'Untitled'; }),
    tgoal: (id, v) => mutate(d => { d.tasks.find(t => t.id === id).gv = Math.max(0, +v || 0); }),
    tunit: (id, v) => mutate(d => { d.tasks.find(t => t.id === id).gu = v; }),
    tdesc: (id, v) => mutate(d => { d.tasks.find(t => t.id === id).desc = v; }),
    ddesc: (id, v) => mutate(d => { d.dashes.find(x => x.id === id).desc = v; }),
    dname: (id, v) => mutate(d => { d.dashes.find(x => x.id === id).name = v || 'Untitled'; }),
    assign: (did, tid, on) => mutate(d => {
      const x = d.dashes.find(y => y.id === did);
      x.tasks = x.tasks.filter(i => i !== tid);
      if (on) x.tasks.push(tid);
    }),
    cid: v => { GD.cid = v; LS.set('sl-cid', GD.cid || null); rerender(); },
    import: input => {
      const f = input.files[0];
      if (!f) return;
      if (f.size > 5e6) { setErr('That file is too large to be a Session Ledger export.'); input.value = ''; return; }
      const r = new FileReader();
      r.onload = () => {
        input.value = '';
        try {
          const c = clean(JSON.parse(r.result));
          if (!c) throw new Error('invalid');
          setDlg({
            title: 'Replace all data?',
            msg: 'This replaces everything currently saved with the contents of ' + f.name + '. It cannot be undone.',
            yes: 'Replace everything',
            fn: d => { Object.keys(d).forEach(k => delete d[k]); Object.assign(d, c); },
          });
        } catch (x) { setErr('That file is not a valid Session Ledger export.'); }
      };
      r.readAsText(f);
    },
  };

  /* Pick up changes made through another browser. */
  const pull = async () => {
    const b = backend();
    if (!b || needRef.current || bootRef.current || b.busy) return;
    const a = document.activeElement;
    if (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) return;
    try {
      const c = await b.pull();
      if (c) { apply(c); setSavedAt(now()); }
    } catch (e) { /* try again next time */ }
  };
  const pullRef = useRef(pull);
  pullRef.current = pull;

  useEffect(() => {
    const go = () => pullRef.current();
    const i = setInterval(go, 4000);
    addEventListener('focus', go);
    document.addEventListener('visibilitychange', go);
    return () => { clearInterval(i); removeEventListener('focus', go); document.removeEventListener('visibilitychange', go); };
  }, []);

  /* First load: reconnect to the data file chosen last time. */
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      try {
        if (GD.on) { setNeed(true); GD.lib().catch(() => {}); }
        else if (FS.ok) {
          const h = await FS.get();
          if (h) {
            FS.h = h;
            if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') { const c = await FS.load(); if (c) apply(c); }
            else setNeed(true);
          }
        }
      } catch (e) { /* fall back to the browser cache */ }
      bootRef.current = false;
      setBoot(false);
    })();
  }, [apply]);

  /* ---- render ---- */
  const b = backend();
  const name = b ? backendName() : '';
  let content;
  if (boot) content = <div className="empty">Loading</div>;
  else if (b && need && !GD.ready) content = <Lock name={name} drive={GD.on} A={act} />;
  else if (tab === 'dash')
    content = D.tasks.length ? (
      <>
        {!b && <Banner fsOk={FS.ok} A={act} />}
        <Dashboard D={D} range={range} chart={chart} openMap={openMap} edit={edit} A={act} />
      </>
    ) : (
      <Welcome storageName={name} fsOk={FS.ok} A={act} />
    );
  else content = <Settings D={D} cid={GD.cid} driveOn={GD.on} backendName={name} fsOk={FS.ok} C={C} A={act} />;

  return (
    <main>
      <header>
        <h1>Session Ledger</h1>
        <StatusPill need={need} err={err} savedAt={savedAt} where={b ? name : 'browser cache only'} drive={GD.on} onReconnect={() => act.reconnect()} />
        {tab === 'dash' && (
          <select value={D.cur || ''} onChange={e => C.cur(e.target.value)} aria-label="Dashboard">
            {D.dashes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <button onClick={() => act.tab()}>{tab === 'dash' ? 'Settings' : 'Back to dashboard'}</button>
        <button className="g" onClick={() => act.theme()} aria-label="Toggle theme">◐</button>
      </header>
      <div>{content}</div>
      <Dialog dlg={dlg} A={act} />
      <ConsentBanner />
    </main>
  );
}
