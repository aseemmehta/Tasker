import { useState } from 'react';
import { GU, hm, totalMs } from '../lib/data.js';
import { CommitInput } from './Misc.jsx';
import { PrivacySettings } from './Consent.jsx';

function UnitSelect({ value, onChange, ...rest }) {
  return (
    <select value={value || 'min/day'} onChange={e => onChange(e.target.value)} aria-label="Goal unit" {...rest}>
      {GU.map(u => <option key={u}>{u}</option>)}
    </select>
  );
}

function NewTask({ onAdd }) {
  const [n, setN] = useState('');
  const [g, setG] = useState('');
  const [u, setU] = useState('min/day');
  const [desc, setDesc] = useState('');
  const submit = () => {
    if (!n.trim()) return;
    onAdd({ name: n.trim(), gv: +g || 0, gu: u, desc: desc.trim() });
    setN(''); setG(''); setDesc('');
  };
  return (
    <div className="card row">
      <input placeholder="New task name" value={n} onChange={e => setN(e.target.value)} />
      <input type="number" min="0" step="any" placeholder="Goal" style={{ width: 80 }} value={g} onChange={e => setG(e.target.value)} />
      <UnitSelect value={u} onChange={setU} />
      <input placeholder="Description (optional)" style={{ flex: '1 1 180px' }} value={desc} onChange={e => setDesc(e.target.value)} />
      <button className="p" onClick={submit}>Add task</button>
    </div>
  );
}

function NewDash({ onAdd }) {
  const [n, setN] = useState('');
  const [desc, setDesc] = useState('');
  const submit = () => {
    if (!n.trim()) return;
    onAdd(n.trim(), desc.trim());
    setN(''); setDesc('');
  };
  return (
    <div className="card row">
      <input placeholder="New dashboard name" value={n} onChange={e => setN(e.target.value)} />
      <input placeholder="Description (optional)" style={{ flex: '1 1 180px' }} value={desc} onChange={e => setDesc(e.target.value)} />
      <button className="p" onClick={submit}>Add dashboard</button>
    </div>
  );
}

export function Settings({ D, cid, driveOn, backendName, fsOk, C, A }) {
  const active = D.tasks.filter(t => !t.arch);
  const archived = D.tasks.filter(t => t.arch);
  return (
    <>
      <h2>Tasks</h2>
      {active.map(t => (
        <div className="card row" key={t.id}>
          <CommitInput value={t.name} onCommit={v => C.tname(t.id, v)} aria-label="Task name" />
          <CommitInput type="number" min="0" step="any" value={t.gv || 0} style={{ width: 80 }} aria-label="Goal amount" onCommit={v => C.tgoal(t.id, v)} />
          <UnitSelect value={t.gu} onChange={v => C.tunit(t.id, v)} />
          <CommitInput value={t.desc || ''} placeholder="Description" style={{ flex: '1 1 200px' }} onCommit={v => C.tdesc(t.id, v)} />
          <button className="g sp" onClick={() => A.archive(t.id)}>Archive</button>
          <button className="g" onClick={() => A.deltask(t.id)}>Delete</button>
        </div>
      ))}
      <NewTask onAdd={A.addtask} />

      {archived.length > 0 && (
        <>
          <h2>Archived tasks</h2>
          {archived.map(t => (
            <div className="card row" key={t.id}>
              <span>{t.name}</span>
              <span className="mute">{t.s.length} sessions, {hm(totalMs(t))}</span>
              <button className="sp" onClick={() => A.archive(t.id)}>Restore</button>
              <button className="g" onClick={() => A.deltask(t.id)}>Delete</button>
            </div>
          ))}
        </>
      )}

      <h2>Dashboards</h2>
      {D.dashes.map(d => (
        <div className="card" key={d.id}>
          <div className="row">
            <CommitInput value={d.name} onCommit={v => C.dname(d.id, v)} aria-label="Dashboard name" />
            <CommitInput value={d.desc || ''} placeholder="Description" style={{ flex: '1 1 200px' }} onCommit={v => C.ddesc(d.id, v)} />
            <button className="g sp" onClick={() => A.deldash(d.id)}>Delete</button>
          </div>
          <div style={{ marginTop: 8 }}>
            {active.length ? (
              active.map(t => (
                <label className="chk" key={t.id}>
                  <input type="checkbox" checked={d.tasks.includes(t.id)} onChange={e => C.assign(d.id, t.id, e.target.checked)} />
                  {t.name}
                </label>
              ))
            ) : (
              <span className="mute">Add tasks first.</span>
            )}
          </div>
        </div>
      ))}
      <NewDash onAdd={A.adddash} />

      <h2>Data</h2>
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <CommitInput
            value={cid}
            placeholder="Google OAuth client ID (ends in .apps.googleusercontent.com)"
            style={{ flex: '1 1 280px' }}
            aria-label="Google client ID"
            onCommit={v => C.cid(v)}
          />
        </div>
        <p className="mute" style={{ marginTop: 0 }}>
          {backendName ? (
            <>
              Source of truth: <strong>{backendName}</strong>. Every change is written to this file, and changes made in
              another browser appear here within a few seconds.
            </>
          ) : (
            'No data file linked. Connect Google Drive (works in every browser)' + (fsOk ? ', or link a local JSON file.' : '.')
          )}
        </p>
        <div className="row">
          <button className="p" onClick={() => A.gdconnect()}>{driveOn ? 'Reconnect Google Drive' : 'Connect Google Drive'}</button>
          {fsOk && (
            <>
              <button className="p" onClick={() => A.mkfile()}>Create new data file</button>
              <button onClick={() => A.openfile()}>Use existing data file</button>
            </>
          )}
          {backendName && <button className="g" onClick={() => A.unlink()}>Unlink</button>}
          <button onClick={() => A.export()}>Export JSON</button>
          <label className="mute">
            Import: <input type="file" accept=".json,application/json" onChange={e => C.import(e.target)} />
          </label>
        </div>
      </div>

      <PrivacySettings />
    </>
  );
}
