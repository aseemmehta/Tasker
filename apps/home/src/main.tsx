import { createRoot } from 'react-dom/client';
import '@tasker/shared/theme.css';

createRoot(document.getElementById('root')!).render(
  <main>
    <h1>Tasker</h1>
    <a className="card" href="./time/"><strong>Time Tracker</strong><div className="mute">Track repeatable tasks, goals and streaks. New version, being built.</div></a>
    <a className="card" href="./legacy/"><strong>Time Tracker (classic)</strong><div className="mute">The full single-file version, kept until the new one has every feature.</div></a>
    <div className="card"><strong>Financial Tracker</strong><div className="mute">Coming later.</div></div>
  </main>,
);
