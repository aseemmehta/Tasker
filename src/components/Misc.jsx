import { useEffect, useRef, useState } from 'react';

/* Text/number input that commits on blur or Enter (like the native "change" event). */
export function CommitInput({ value, onCommit, trim = true, ...rest }) {
  const [v, setV] = useState(String(value ?? ''));
  useEffect(() => setV(String(value ?? '')), [value]);
  const commit = () => {
    const nv = trim ? v.trim() : v;
    setV(nv);
    if (nv !== String(value ?? '')) onCommit(nv);
  };
  return (
    <input
      {...rest}
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

export function StatusPill({ need, err, savedAt, where, drive, onReconnect }) {
  let content;
  if (need)
    content = (
      <>
        {drive ? 'Signed out of Google' : 'Data file needs permission'}
        <button onClick={onReconnect}>{drive ? 'Sign in' : 'Reconnect'}</button>
      </>
    );
  else if (err) content = err;
  else content = savedAt ? 'Saved ' + new Date(savedAt).toLocaleTimeString() + ' · ' + where : 'Ready · ' + where;
  return (
    <span className={'pill' + (err ? ' err' : '')} role="status">
      {content}
    </span>
  );
}

export function Welcome({ storageName, fsOk, A }) {
  return (
    <div className="card">
      <h3>Welcome to Session Ledger</h3>
      <p className="mute">
        Track the time you spend on repeatable tasks. Start and stop as often as you like, fix times when something goes
        wrong, and see your totals, streaks and goals.
      </p>
      {storageName ? (
        <p className="mute">
          Storage: <strong>{storageName}</strong>.
        </p>
      ) : (
        <>
          <p>Choose where your data is saved:</p>
          <div className="row">
            <button className="p" onClick={() => A.gdconnect()}>Connect Google Drive</button>
            {fsOk && (
              <>
                <button onClick={() => A.mkfile()}>Create local JSON file</button>
                <button onClick={() => A.openfile()}>Use existing JSON file</button>
              </>
            )}
          </div>
          <p className="mute">
            Google Drive works in every browser and on phones. Local JSON files only work in Chrome and Edge.
            {fsOk ? '' : ' This browser does not support them.'}
          </p>
        </>
      )}
      <p className="mute">
        Next, open <strong>Settings</strong> (top right) and add your tasks. Give each task an optional daily or weekly
        goal, and group tasks into dashboards there.
      </p>
      <div className="row">
        <button className="p" onClick={() => A.tab()}>Open Settings</button>
      </div>
    </div>
  );
}

export function Banner({ fsOk, A }) {
  return (
    <div className="card">
      <strong>Data is only in this browser's cache.</strong>
      <p className="mute">Connect Google Drive so one JSON file is the source of truth on every device and browser.</p>
      <div className="row">
        <button className="p" onClick={() => A.gdconnect()}>Connect Google Drive</button>
        {fsOk && <button onClick={() => A.mkfile()}>Use a local file instead</button>}
      </div>
    </div>
  );
}

export function Lock({ name, drive, A }) {
  return (
    <div className="card">
      <strong>Data: {name}</strong>
      <p className="mute">Your data lives there. {drive ? 'Sign in to Google' : 'Allow access'} so it can be loaded.</p>
      <div className="row">
        <button className="p" onClick={() => A.reconnect()}>Continue</button>
      </div>
    </div>
  );
}

export function Dialog({ dlg, A }) {
  const noRef = useRef(null);
  useEffect(() => {
    if (!dlg) return;
    noRef.current && noRef.current.focus();
    const onKey = e => { if (e.key === 'Escape') A.dlgno(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dlg]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!dlg) return null;
  return (
    <div className="ov">
      <div className="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dt">
        <h3 id="dt">{dlg.title}</h3>
        <p>{dlg.msg}</p>
        <div className="row">
          <button ref={noRef} onClick={() => A.dlgno()}>Cancel</button>
          {dlg.alt && <button onClick={() => A.dlgalt()}>{dlg.alt}</button>}
          <button className="danger" onClick={() => A.dlgyes()}>{dlg.yes}</button>
        </div>
      </div>
    </div>
  );
}
