/**
 * End-to-end check that LIVE Arduino gas readings reach the dashboard.
 *
 * Runs in a browser, mocks navigator.serial with a fake port that prints
 * deliberately distinctive readings (CH4 1235+, CO 56, H2S 7), clicks the
 * real "Connect Arduino" button and asserts:
 *   1. before connecting  → honest no-data state (— everywhere, no demo tags)
 *   2. after connecting   → MG-001 gas cards show the injected live values
 *   3. MG-002             → still no data (never fed by the Arduino)
 *   4. back on MG-001     → live values again
 *   5. Devices page       → MG-001 shows USB power + USB serial transport,
 *                           MG-002 shows honest empty values
 *   6. baud fallback      → silent at 9600, app reopens at 115200 and
 *                           live readings recover
 * Results are written to #assert-results and document.title.
 */
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';

const enc = new TextEncoder();
let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
let tx = 0;
let timer = 0;
/** Baud rates the app requested from open(), in order. */
const openBauds: number[] = [];
/** Baud rates whose lines actually carry data (the mock can go silent). */
let emitOn: number[] = [9600];
let currentBaud = 0;

const fakePort = {
  // Web Serial semantics: close() ends the current stream, open() installs a
  // fresh one — otherwise the old reader stays locked and the next readLoop
  // dies before baud detection can do its job.
  readable: null as ReadableStream<Uint8Array> | null,
  async open(opts?: { baudRate?: number }) {
    currentBaud = opts?.baudRate ?? 0;
    openBauds.push(currentBaud);
    window.clearInterval(timer);
    fakePort.readable = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });
    timer = window.setInterval(() => {
      if (!emitOn.includes(currentBaud)) return;
      tx += 1;
      try {
        // Exactly what a serial-monitor sketch prints — decimals included.
        controller?.enqueue(
          enc.encode(`CH4: ${1234 + tx}.55 ppm  CO: 56.00 ppm  H2S: 7.00 ppm\n`),
        );
      } catch {
        /* stream already closed */
      }
    }, 300);
  },
  async close() {
    window.clearInterval(timer);
    try {
      controller?.close();
    } catch {
      /* already closed */
    }
    controller = null;
    fakePort.readable = null;
  },
};

Object.defineProperty(navigator, 'serial', {
  configurable: true,
  value: {
    requestPort: async () => fakePort,
    getPorts: async () => [],
  },
});

const checks: string[] = [];
const check = (ok: boolean, label: string) => checks.push(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const gas = () =>
  [...document.querySelectorAll('.gas-value')].map((el) => Number(el.textContent));
const gasTexts = () =>
  [...document.querySelectorAll('.gas-value')].map((el) => el.textContent ?? '');
const body = () => document.body.innerText;

function FastPoll() {
  const { updateSettings } = useStoreUpdate();
  useEffect(() => {
    updateSettings({ pollMs: 250 });
  }, [updateSettings]);
  return null;
}

let useStoreUpdate: () => { updateSettings: (p: { pollMs: number }) => void };

function finish() {
  const pre = document.createElement('pre');
  pre.id = 'assert-results';
  pre.textContent = checks.join('\n');
  document.body.appendChild(pre);
  const verdict = checks.filter((c) => /^(PASS|FAIL)/.test(c));
  document.title = verdict.length > 0 && verdict.every((c) => c.startsWith('PASS')) ? 'ALL PASS' : 'SOME FAIL';
}

void (async () => {
  const { StoreProvider, useStore } = await import('../state/store');
  const { App } = await import('../App');
  const { SerialConnectButton } = await import('../components/SerialConnectButton');
  useStoreUpdate = useStore;

  const host = document.createElement('div');
  document.body.appendChild(host);
  createRoot(host).render(
    <StrictMode>
      <StoreProvider>
        <FastPoll />
        <App />
        <SerialConnectButton />
      </StoreProvider>
    </StrictMode>,
  );

  await sleep(700);

  // 1. Honest empty state before connecting — no invented numbers, no demo tags.
  checks.push(`INFO  hero-meta: ${JSON.stringify(document.querySelector('.hero-meta')?.textContent ?? 'none')}`);
  check(!/live feed/i.test(body()), 'no Live feed chip before connecting');
  check(
    /No data/.test(document.querySelector('.hero-meta')?.textContent ?? ''),
    'hero chip label is No data',
  );
  check(
    gasTexts().length === 3 && gasTexts().every((v) => v === '—'),
    `MG-001 shows no values before connecting (${gasTexts().join(', ')})`,
  );
  check(!/DEMO DATA/i.test(body()), 'no DEMO DATA tag anywhere');
  check(!/Simulated feed/i.test(body()), 'no Simulated feed tag anywhere');

  // 2. Connect the fake serial port through the real button.
  const btn = [...document.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Connect Arduino'),
  );
  check(!!btn, 'Connect Arduino button rendered');
  btn?.click();
  await sleep(1600);

  check(openBauds[0] === 9600, `port first opened at 9600 baud (got ${openBauds[0]})`);

  const live = gas();
  checks.push(`INFO  hero-meta: ${JSON.stringify(document.querySelector('.hero-meta')?.textContent ?? 'none')}`);
  check(body().includes('USB serial live'), 'serial control reports USB serial live');
  check(/live feed/i.test(body()), 'hero chip flipped to Live feed');
  check(
    live[0] >= 1235 && live[0] <= 1300 && live[1] === 56 && live[2] === 7,
    `MG-001 shows live Arduino gas CH4=${live[0]} CO=${live[1]} H2S=${live[2]}`,
  );
  check(
    !/RAW SENSOR LEVEL/i.test(body()),
    'lines carrying "ppm" are shown as ppm, never as RAW SENSOR LEVEL',
  );
  check(
    /\.[1-9]/.test(document.querySelector('.gas-value')?.textContent ?? ''),
    `gas card keeps sensor decimals (got "${document.querySelector('.gas-value')?.textContent}")`,
  );

  // 3. A manhole with no device must show no data — never another node's values.
  window.location.hash = '#/manholes/MG-002';
  await sleep(900);
  const other = gasTexts();
  check(
    other.length === 3 && other.every((v) => v === '—'),
    `MG-002 shows no values (${other.join(', ')})`,
  );
  check(
    document.querySelector('.app')?.getAttribute('data-status') === 'offline',
    'MG-002 overall status = offline',
  );

  // 4. Back to the live node.
  window.location.hash = '#/manholes/MG-001';
  await sleep(900);
  const again = gas();
  check(
    again[0] >= 1235 && again[0] <= 1300 && again[1] === 56 && again[2] === 7,
    `MG-001 live again (CH4=${again[0]} CO=${again[1]} H2S=${again[2]})`,
  );

  // 5. Devices page: live node reports USB power + serial, demo nodes keep theirs.
  window.location.hash = '#/devices';
  await sleep(700);
  const cards = [...document.querySelectorAll('.mh-grid > .panel')];
  const cardFor = (id: string) =>
    cards.find((c) =>
      [...c.querySelectorAll('.dev-row')].some(
        (r) => r.querySelector('.dev-key')?.textContent === 'Device ID' && r.textContent?.includes(id),
      ),
    );
  const cardText = (id: string) => cardFor(id)?.textContent ?? '';
  const mg1 = cardText('MG-001');
  const mg2 = cardText('MG-002');
  check(mg1.includes('USB powered'), 'MG-001 shows USB powered while live');
  check(mg1.includes('USB serial · 9600 baud'), 'MG-001 transport = USB serial · 9600 baud');
  check(mg1.includes('Connected'), 'MG-001 link = Connected');
  check(!mg2.includes('USB powered') && !/\d+%/.test(mg2), 'MG-002 shows no invented battery value');
  check(!mg2.includes('Serial gateway'), 'MG-002 has no fabricated transport');
  check(mg2.includes('Disconnected'), 'MG-002 link = Disconnected');

  // 6. Baud fallback: silent at 9600 → the app reopens at 115200 and recovers.
  emitOn = [115200];
  const stopBtn = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === 'Stop',
  );
  stopBtn?.click();
  await sleep(400);
  const reconnect = [...document.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Connect Arduino'),
  );
  check(!!reconnect, 'Connect Arduino button available after Stop');
  reconnect?.click();
  // The gas cards live on the detail page (we were on #/devices for step 5).
  window.location.hash = '#/manholes/MG-001';
  await sleep(7000); // 5 s probe at 9600 → reopen at 115200 → first line
  check(
    openBauds.join(',') === '9600,9600,115200',
    `baud fallback 9600 → 115200 (got ${openBauds.join(',')})`,
  );
  const fallback = gas();
  check(
    fallback[1] === 56 && fallback[2] === 7,
    `MG-001 live again after fallback (CO=${fallback[1]} H2S=${fallback[2]})`,
  );
  check(/USB serial · 115200 baud/.test(body()), 'transport now reports the confirmed 115200 baud');

  finish();
})();


