import { useEffect, useState } from 'react';
import { DriveStore, uid, todayMs, type Data } from '@tasker/shared';
import { CLIENT_ID, FILE_NAME } from './config';

const store = new DriveStore(CLIENT_ID, FILE_NAME);
const hm = (ms: number) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

export default function App() {
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState('Not connected');
  const [name, setName] = useState('');

  // Pick up changes made on another device.
  useEffect(() => {
    if (!data) return;
    const t = setInterval(() => store.pull().then((d) => d && setData(d)).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [data !== null]);

  const connect = async () => {
    try { await store.signIn(); setData(await store.load()); setStatus('Connected'); }
    catch (e) { setStatus((e as Error).message); }
  };

  // Every change is saved immediately.
  const change = (f: (d: Data) => void) => {
    if (!data) return;
    const d = structuredClone(data); f(d); setData(d);
    store.save(d).then((m) => { if (m !== d) setData(m); setStatus('Saved ' + new Date().toLocaleTimeString()); })
      .catch((e) => setStatus((e as Error).message));
  };

  if (!data) return (
    <main>
      <h1>Time Tracker</h1>
      <div className="card">
        <strong>Welcome</strong>
        <p className="mute">Connect Google Drive to load or create your data file, then add your tasks.</p>
        <button className="p" onClick={connect}>Connect Google Drive</button>
        <p className="mute">{status}</p>
      </div>
    </main>
  );

  const tasks = data.tasks.filter((t) => !t.arch);
  return (
    <main>
      <div className="row"><h1>Time Tracker</h1><span className="mute sp">{status}</span></div>
      <form className="card row" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (!n) return;
        change((d) => { const t = { id: uid(), name: n, desc: '', gv: 0, gu: 'min/day' as const, arch: false, s: [] }; d.tasks.push(t); d.dashes[0]?.tasks.push(t.id); }); setName(''); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New task name" aria-label="New task name" />
        <button className="p" type="submit">Add task</button>
      </form>
      {tasks.map((t) => {
        const run = t.s.find((x) => x.e === null);
        return (
          <div className="card row" key={t.id}>
            <strong>{t.name}</strong><span className="mute">today {hm(todayMs(t))}</span>
            <button className={run ? 'sp' : 'p sp'} onClick={() => change((d) => {
              const x = d.tasks.find((y) => y.id === t.id)!; const r = x.s.find((s) => s.e === null);
              if (r) r.e = Date.now(); else x.s.push({ id: uid(), s: Date.now(), e: null }); })}>{run ? 'Stop' : 'Start'}</button>
          </div>
        );
      })}
    </main>
  );
}
