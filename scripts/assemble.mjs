import { cpSync, rmSync, mkdirSync } from 'node:fs';
rmSync('site', { recursive: true, force: true });
mkdirSync('site');
cpSync('apps/home/dist', 'site', { recursive: true });
cpSync('apps/time/dist', 'site/time', { recursive: true });
mkdirSync('site/legacy');
cpSync('legacy/time-tracker.html', 'site/legacy/index.html'); // classic single-file tracker, kept until the port is finished
