import { useEffect, useState } from 'react';
import {
  bucketKey, buckets, clk, dk, dur, goalInfo, goalStat, hm, loc, running, streak, tm, todayMs,
} from '../lib/data.js';

/* Re-render the calling component every `ms` (live clock and goal bar). */
function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    const i = setInterval(() => set(x => x + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}

function TaskClock({ t }) {
  useTick();
  return <div className="clock sp">{clk(todayMs(t))}</div>;
}

function GoalBar({ t }) {
  useTick();
  const gi = goalInfo(t);
  const g = gi ? Math.min(100, (gi.done / gi.ms) * 100) : 0;
  return (
    <div className="bar">
      <i className={g >= 100 ? 'done' : ''} style={{ width: g + '%' }} />
    </div>
  );
}

function AddSession({ onAdd }) {
  const [s, setS] = useState('');
  const [e, setE] = useState('');
  return (
    <div className="row" style={{ marginTop: 12 }}>
      <span className="mute">Add a past session</span>
      <input type="datetime-local" value={s} onChange={x => setS(x.target.value)} aria-label="Session start" />
      <input type="datetime-local" value={e} onChange={x => setE(x.target.value)} aria-label="Session end" />
      <button onClick={() => onAdd(new Date(s).getTime(), new Date(e).getTime(), () => { setS(''); setE(''); })}>Add</button>
    </div>
  );
}

function EditSession({ x, onSave, onCancel }) {
  const [s, setS] = useState(loc(x.s));
  const [e, setE] = useState(x.e ? loc(x.e) : '');
  return (
    <div className="ses">
      <input type="datetime-local" value={s} onChange={v => setS(v.target.value)} aria-label="Session start" />
      <input type="datetime-local" value={e} onChange={v => setE(v.target.value)} aria-label="Session end" />
      <button className="p" onClick={() => onSave(x, s, e)}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}

function TaskCard({ t, open, edit, A }) {
  const run = running(t);
  const gi = goalInfo(t);
  const rows = [];
  if (open) {
    let last = '';
    [...t.s].sort((a, b) => b.s - a.s).slice(0, 40).forEach(x => {
      const k = dk(x.s);
      if (k !== last) {
        last = k;
        const tot = t.s.filter(y => dk(y.s) === k).reduce((a, y) => a + dur(y), 0);
        rows.push(
          <div className="day" key={'d' + k}>
            {new Date(x.s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
            <span className="mute">· {hm(tot)}</span>
          </div>
        );
      }
      rows.push(
        edit === x.id ? (
          <EditSession key={x.id} x={x} onSave={(sx, s, e) => A.saveses(t.id, sx.id, s, e, !!sx.e)} onCancel={() => A.canceledit()} />
        ) : (
          <div className="ses" key={x.id}>
            <span>{tm(x.s)} – {x.e ? tm(x.e) : 'running'}</span>
            <span className="mute">{x.e ? hm(dur(x)) : ''}</span>
            <span className="sp" />
            <button onClick={() => A.editses(x.id)}>Edit</button>
            <button className="g" onClick={() => A.delses(t.id, x.id)}>Delete</button>
          </div>
        )
      );
    });
  }
  return (
    <article className={'card' + (run ? ' live' : '')}>
      <div className="row">
        <h3>{t.name}</h3>
        <TaskClock t={t} />
      </div>
      <GoalBar t={t} />
      {t.desc ? <div className="mute">{t.desc}</div> : null}
      <div className="mute">
        {gi ? 'Goal ' + t.gv + ' ' + (t.gu || 'min/day') : 'No goal set'} · clock shows today
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className={run ? 'run' : 'p'} onClick={() => A.toggle(t.id)}>{run ? 'Stop' : 'Start'}</button>
        <button onClick={() => A.open(t.id)}>{open ? 'Close' : 'Edit times (' + t.s.length + ')'}</button>
      </div>
      {open && (
        <>
          <AddSession onAdd={(s, n, reset) => A.addses(t.id, s, n, reset)} />
          {rows}
        </>
      )}
    </article>
  );
}

function LineSvg({ bs, tot, max }) {
  const W = 320, H = 150;
  const px = i => 20 + (i * (W - 40)) / Math.max(1, bs.length - 1);
  const py = v => H - 28 - (v / max) * (H - 56);
  const pts = bs.map((b, i) => px(i) + ',' + py(tot[b.k])).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Line chart of time spent" style={{ display: 'block', marginTop: 8 }}>
      <line x1="10" x2={W - 10} y1={H - 28} y2={H - 28} stroke="var(--line)" />
      <polyline points={pts} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinejoin="round" />
      {bs.map((b, i) => (
        <g key={b.k}>
          <circle cx={px(i)} cy={py(tot[b.k])} r="3.5" fill="var(--acc)" />
          <text x={px(i)} y={py(tot[b.k]) - 8} textAnchor="middle" fontSize="9" fill="var(--ink)">{tot[b.k] ? hm(tot[b.k]) : ''}</text>
          <text x={px(i)} y={H - 10} textAnchor="middle" fontSize="9" fill="var(--mute)">{b.l}</text>
        </g>
      ))}
    </svg>
  );
}

function Metrics({ ts, range, chart, A }) {
  const bs = buckets(range);
  const tot = {};
  bs.forEach(b => (tot[b.k] = 0));
  const per = ts.map(t => {
    let m = 0;
    t.s.forEach(x => {
      const k = bucketKey(range, x.s);
      if (k in tot) { tot[k] += dur(x); m += dur(x); }
    });
    return { t, m };
  });
  const max = Math.max(1, ...Object.values(tot));
  const all = Object.values(tot).reduce((a, b) => a + b, 0);
  const pmax = Math.max(1, ...per.map(p => p.m));
  const unit = { day: 'last 7 days', week: 'last 8 weeks', month: 'last 6 months' }[range];
  return (
    <>
      <div className="card">
        <div className="row">
          <div className="seg">
            {['day', 'week', 'month'].map(x => (
              <button key={x} className={range === x ? 'on' : ''} onClick={() => A.range(x)}>
                {x[0].toUpperCase() + x.slice(1)}
              </button>
            ))}
          </div>
          <button className="g sp" onClick={() => A.chart()} aria-label="Switch between bar and line chart" title="Bar / line">
            {chart === 'line' ? '▥' : '⌇'}
          </button>
          <span className="mute">{unit}: <strong>{hm(all)}</strong></span>
        </div>
        {chart === 'line' ? (
          <LineSvg bs={bs} tot={tot} max={max} />
        ) : (
          <div className="chart">
            {bs.map(b => (
              <div className="col" key={b.k}>
                <em>{tot[b.k] ? hm(tot[b.k]) : ''}</em>
                <b style={{ height: (tot[b.k] / max) * 100 * 0.78 + '%' }} />
                <span>{b.l}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3>By task · {unit}</h3>
        {per.map(p => (
          <div style={{ marginTop: 10 }} key={p.t.id}>
            <div className="row"><span>{p.t.name}</span><span className="sp mute">{hm(p.m)}</span></div>
            <div className="hb" style={{ width: (p.m / pmax) * 100 + '%' }} />
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Streaks and goals</h3>
        {ts.map(t => {
          const s = streak(t), gs = goalStat(t);
          return (
            <div style={{ marginTop: 10 }} key={t.id}>
              <strong>{t.name}</strong>
              <div className="stats">
                <div><strong>{s.n}</strong><span className="mute">day streak</span></div>
                <div><strong>{s.total}</strong><span className="mute">days practiced</span></div>
                <div><strong>{gs[0]}</strong><span className="mute">{gs[1]}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Dashboard({ D, range, chart, openMap, edit, A }) {
  const d = D.dashes.find(x => x.id === D.cur) || D.dashes[0];
  if (!d) return <div className="empty">No dashboards yet. Create one in Settings.</div>;
  const ts = d.tasks.map(id => D.tasks.find(t => t.id === id)).filter(t => t && !t.arch);
  if (!ts.length) return <div className="empty">This dashboard has no tasks. Add tasks to it in Settings.</div>;
  return (
    <>
      {d.desc ? <p className="mute">{d.desc}</p> : null}
      {ts.map(t => <TaskCard key={t.id} t={t} open={!!openMap[t.id]} edit={edit} A={A} />)}
      <h2>Metrics</h2>
      <Metrics ts={ts} range={range} chart={chart} A={A} />
    </>
  );
}

