import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reuse a running dev server when there is one, otherwise start our own.
let base = 'http://localhost:5173';
let vite = null;
try {
  const res = await fetch(base + '/', { signal: AbortSignal.timeout(1500) });
  if (!res.ok) throw new Error('not ok');
} catch {
  base = 'http://localhost:5199';
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '5199', '--strictPort'], {
    stdio: 'ignore',
  });
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch(base + '/', { signal: AbortSignal.timeout(1000) });
      if (res.ok) break;
    } catch {
      /* keep waiting */
    }
  }
}
const URL = base + '/test-live.html';
const profile = mkdtempSync(join(tmpdir(), 'mg-cdp-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--no-first-run',
    `--user-data-dir=${profile}`,
    '--remote-debugging-pipe',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
);

const write = chrome.stdio[3];
const read = chrome.stdio[4];
let buf = '';
const pending = new Map();
let nextId = 1;

read.on('data', (chunk) => {
  buf += chunk.toString('utf8');
  let idx;
  while ((idx = buf.indexOf('\0')) !== -1) {
    const msg = JSON.parse(buf.slice(0, idx));
    buf = buf.slice(idx + 1);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

function send(method, params = {}, sessionId) {
  const id = nextId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  write.write(JSON.stringify(payload) + '\0');
  return new Promise((resolve, reject) => {
    pending.set(id, (msg) => (msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout: ${method}`));
      }
    }, 15000);
  });
}

try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Page.navigate', { url: URL }, sessionId);

  let report = '';
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    const res = await send(
      'Runtime.evaluate',
      {
        expression:
          "document.getElementById('assert-results')?.textContent || document.title || 'loading'",
        returnByValue: true,
      },
      sessionId,
    );
    report = res.result.value ?? '';
    if (report.includes('PASS  ') || report.includes('SOME FAIL') || report.includes('ALL PASS')) break;
  }

  const title = await send(
    'Runtime.evaluate',
    { expression: 'document.title', returnByValue: true },
    sessionId,
  );
  console.log('TITLE:', title.result.value);
  console.log(report);
} catch (err) {
  console.error('ERROR:', err.message);
} finally {
  chrome.kill();
  vite?.kill();
  setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1000);
}
