// Browser tests: serve the built extension pages, load fixture sites with the real content script,
// and drive them with Playwright (playwright-core). Requires a Chromium binary: set CHROME_PATH.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const sourceRoot = join(here, '..', '..');
const repoRoot = join(sourceRoot, '..');
const fixtures = join(here, 'fixtures');
const outDir = join(sourceRoot, '.test-out', 'browser');
const shots = join(sourceRoot, '.test-out', 'screenshots');

const chromePath = process.env.CHROME_PATH;
if (!chromePath || !existsSync(chromePath)) {
  console.error('Set CHROME_PATH to a Chromium or Chrome binary to run the browser tests.');
  process.exit(2);
}

// 1. Fresh build of the extension (the browser tests load the built files, not the sources).
const build1 = spawnSync(process.execPath, [join(sourceRoot, 'esbuild.config.js')], { stdio: 'inherit' });
if (build1.status !== 0) process.exit(build1.status ?? 1);

// 2. Harness bundle (simulated browser + real controller) injected into every test page.
mkdirSync(outDir, { recursive: true });
mkdirSync(shots, { recursive: true });
await build({
  entryPoints: [join(here, 'harness.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  outfile: join(outDir, 'harness.js'),
  logLevel: 'warning',
});
const harnessCode = readFileSync(join(outDir, 'harness.js'), 'utf8');
const contentCode = readFileSync(join(repoRoot, 'content.js'), 'utf8');

// 3. Static server for the built extension pages (chrome-extension:// is simulated over http).
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const file = join(repoRoot, path === '/' ? 'popup.html' : path);
  if (!file.startsWith(repoRoot) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const SETUP_PAYLOAD = {
  earnFromMin: 60,
  earnToMin: 5,
  unlockCostMin: 10,
  initialBalanceMin: 0,
  productive: ['khanacademy.org', 'coursera.org'],
  half: ['youtube.com'],
  unproductive: ['instagram.com', 'reddit.com'],
  youtubeKeywords: ['JEE', 'NDA', 'Study', 'Learn', 'Education', 'PW'],
  tasks: [],
};

function harnessInit(role, tab = 7) {
  return [
    { content: `window.__ET_ROLE=${JSON.stringify(role)};window.__ET_TAB=${tab};` },
    { content: harnessCode },
  ];
}

async function newPage(context, { role = 'ui', tab = 7, withContent = false } = {}) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  if (process.env.ET_DEBUG) {
    page.on('console', (msg) => console.log(`    [console:${msg.type()}] ${msg.text()}`));
  }
  for (const script of harnessInit(role, tab)) await page.addInitScript(script);
  if (withContent) await page.addInitScript({ content: contentCode });
  page.__errors = errors;
  return page;
}

async function runSetup(context, origin, payload = SETUP_PAYLOAD, balanceMin = null) {
  const page = await newPage(context, { role: 'ui' });
  await context.route(`${origin}/__setup`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>setup</body></html>' }),
  );
  await page.goto(`${origin}/__setup`);
  await page.evaluate(
    async ({ payload, balanceMin }) => {
      await window.__et.sim.installExtension('install');
      const reply = await window.__et.sim.sendFromExtensionPage({
        type: 'ui.command',
        command: { type: 'setup.complete', payload: { ...payload, initialBalanceMin: balanceMin ?? payload.initialBalanceMin } },
      });
      if (!reply.ok) throw new Error(`setup failed: ${reply.error.message}`);
    },
    { payload, balanceMin },
  );
  await page.close();
}

async function setState(page, mutate) {
  await page.evaluate(async (source) => {
    const fn = new Function('s', source);
    const values = await chrome.storage.local.get('state');
    const state = values.state;
    fn(state);
    await chrome.storage.local.set({ state });
  }, mutate);
}

/** Text inside EarnTime's shadow-DOM overlay (banner, covers, chooser). */
async function overlayText(page) {
  return page.evaluate(() => document.getElementById('earntime-root')?.shadowRoot?.textContent ?? '');
}

/** Supply actual video frames without relying on YouTube/network playback in a fixture. */
async function playFixtureShort(page, selector = '#short-player') {
  await page.evaluate(async (selector) => {
    const video = document.querySelector(selector);
    if (!video.srcObject) {
      const canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      const draw = () => {
        ctx.fillStyle = '#184c40';
        ctx.fillRect(0, 0, 280, 480);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        ctx.fillText('Study Short', 60, 240);
        requestAnimationFrame(draw);
      };
      video.srcObject = canvas.captureStream(10);
      draw();
    }
    await video.play();
  }, selector);
  await page.waitForFunction((selector) => {
    const video = document.querySelector(selector);
    return !video.paused && video.videoWidth > 0 && video.readyState >= 2;
  }, selector);
}

function youtubeFixture(pathname, search) {
  if (pathname === '/' || pathname === '') return 'home.html';
  if (pathname === '/results') return 'results.html';
  if (pathname === '/watch') return search.includes('study') ? 'watch-study.html' : 'watch.html';
  if (pathname.startsWith('/shorts/')) return 'shorts.html';
  return null;
}

async function youtubeContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route('https://www.youtube.com/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/__setup') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>setup</body></html>' });
    const file = youtubeFixture(url.pathname, url.search);
    if (!file) return route.fulfill({ status: 404, body: 'no fixture' });
    return route.fulfill({ status: 200, contentType: 'text/html', body: readFileSync(join(fixtures, file), 'utf8') });
  });
  return context;
}

const results = [];
const filter = process.env.ET_FILTER ?? '';
async function test(name, fn) {
  if (filter && !name.toLowerCase().includes(filter.toLowerCase())) return;
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`✔ ${name} (${Date.now() - started} ms)`);
  } catch (err) {
    results.push({ name, ok: false, error: err });
    console.log(`✖ ${name}\n    ${err?.message ?? err}`);
  }
}

const expect = (cond, message) => {
  if (!cond) throw new Error(message);
};

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

try {
  await test('popup renders the dashboard after setup', async () => {
    const context = await browser.newContext({ viewport: { width: 400, height: 760 } });
    await runSetup(context, base, SETUP_PAYLOAD, 12);
    const page = await newPage(context, { role: 'ui' });
    await page.goto(`${base}/popup.html`);
    await page.getByText('Remaining').waitFor();
    const text = await page.locator('body').innerText();
    expect(text.includes('EarnTime'), 'brand shown');
    expect(text.includes('12m'), `balance shown (got ${text.slice(0, 200)})`);
    expect(text.includes('Productive') && text.includes('Unproductive') && text.includes('Half-productive'), 'stat tiles shown');
    expect(page.__errors.length === 0, `no page errors: ${page.__errors.join('; ')}`);
    await page.screenshot({ path: join(shots, 'popup.png') });
    await context.close();
  });

  await test('popup shows DEBT MODE with the amount, repayment and requirement', async () => {
    const context = await browser.newContext({ viewport: { width: 400, height: 900 } });
    await runSetup(context, base);
    const page = await newPage(context, { role: 'ui' });
    await page.goto(`${base}/popup.html`);
    await page.getByText('Remaining').waitFor();
    await setState(page, `s.debtMs = 30*60000; s.debtOriginMs = 30*60000; s.debtSince = Date.now();
      s.lastReconcile = { from: Date.now()-2400000, to: Date.now(), at: Date.now(), visits: 4, cappedVisits: 0, productiveCreditMs: 0, chargedMs: 2400000, debtAddedMs: 1800000, repaidMs: 0, startupCut: false, breakdown: [] };`);
    await page.getByText('DEBT MODE', { exact: true }).waitFor();
    const text = await page.locator('body').innerText();
    expect(text.includes('You owe'), 'debt label');
    expect(text.includes('30m 00s'), `debt amount shown (got ${text.slice(0, 300)})`);
    expect(text.includes('6h 00m'), 'required productive time 30 min debt at 60:5 = 6h');
    expect(text.includes('Why this debt exists'), 'audit explanation present');
    await page.screenshot({ path: join(shots, 'popup-debt.png') });
    await context.close();
  });

  await test('setup wizard runs through all steps and saves once', async () => {
    const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
    const page = await newPage(context, { role: 'ui' });
    await page.goto(`${base}/setup.html`);
    await page.getByText('Study first, then spend').waitFor();
    const steps = await page.getByRole('list', { name: 'Setup progress' }).locator('li').count();
    for (let i = 0; i < steps - 1; i++) await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Finish setup' }).click();
    await page.getByText("You're set").waitFor();
    const stored = await page.evaluate(() => chrome.storage.local.get('state'));
    expect(stored.state.setupDone === true, 'setupDone stored');
    expect(stored.state.settings.earnFromMin === 60 && stored.state.settings.earnToMin === 5, 'default ratio stored');
    expect(stored.state.rules.half.includes('youtube.com'), 'default half sites stored');
    await page.screenshot({ path: join(shots, 'setup-done.png') });
    expect(page.__errors.length === 0, `no page errors: ${page.__errors.join('; ')}`);
    await context.close();
  });

  await test('settings: changes that loosen rules show their cost and are refused without balance', async () => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    await runSetup(context, base, SETUP_PAYLOAD, 0);
    const page = await newPage(context, { role: 'ui' });
    await page.goto(`${base}/settings.html#websites`);
    await page.getByRole('heading', { name: 'Productive' }).first().waitFor();
    await page.fill('#site-add', 'nptel.ac.in');
    await page.selectOption('#site-list', 'productive');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'nptel.ac.in added' }).waitFor();
    expect(await page.getByRole('button', { name: 'Remove nptel.ac.in', exact: true }).count() === 1, 'adding a new productive site is free');

    // Lifting an existing restriction, unlike adding a site, costs the unlock price.
    await page.getByRole('button', { name: 'Remove instagram.com', exact: true }).click();
    await page.getByRole('alert').waitFor();
    const alert = await page.getByRole('alert').innerText();
    expect(alert.includes('This change costs 10 min'), `insufficient balance message (got "${alert}")`);
    expect(await page.getByRole('button', { name: 'Remove instagram.com', exact: true }).count() === 1, 'a refused change does not remove the restriction');

    // Adding an unproductive site also succeeds with no balance.
    await page.fill('#site-add', 'tiktok.com');
    await page.selectOption('#site-list', 'unproductive');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'tiktok.com added' }).waitFor();

    // Tightening the ratio is free; loosening it is refused.
    await page.goto(`${base}/settings.html#time`);
    await page.getByLabel('Earned minutes').fill('6');
    await page.getByRole('button', { name: 'Save earn rule' }).click();
    await page.getByRole('alert').waitFor();
    expect((await page.getByRole('alert').innerText()).includes('This change costs 10 min'), 'loosening the ratio is refused');

    // Protection shows the exact required sentence.
    await page.goto(`${base}/settings.html#protection`);
    await page.getByText('Chrome prevents extensions from completely controlling privileged').waitFor();
    const body = await page.locator('body').innerText();
    // Backticks in the required wording render as inline code, so compare the rendered text without them.
    expect(
      body.includes(
        'Chrome prevents extensions from completely controlling privileged chrome:// pages. Therefore this protection cannot be made absolute using a standard Chrome extension alone.',
      ),
      'exact chrome:// limitation wording',
    );
    expect(body.includes('The fixed adult-site focus guard is always on.'), 'the fixed guard is disclosed');
    expect(await page.locator('#adult-site-guard').count() === 0, 'there is no ordinary guard toggle');
    expect(!body.includes('Trusted-site exceptions') && !body.includes('Add a dedicated site'), 'there are no custom-domain or exception editors');
    await page.screenshot({ path: join(shots, 'settings-protection.png'), fullPage: true });
    expect(page.__errors.length === 0, `no page errors: ${page.__errors.join('; ')}`);
    await context.close();
  });

  await test('settings: YouTube keyword check reads channel names', async () => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    await runSetup(context, base);
    const page = await newPage(context, { role: 'ui' });
    await page.goto(`${base}/settings.html#youtube`);
    await page.getByLabel('Check a channel name').fill('PW Live Classes');
    await page.getByText('Allowed — matches "PW".').waitFor();
    await page.getByLabel('Check a channel name').fill('Cooking With Sam');
    await page.getByText('Hidden — no keyword matches.').waitFor();
    await context.close();
  });

  await test('block page: exhausted, debt and extension-page variants', async () => {
    const context = await browser.newContext({ viewport: { width: 900, height: 800 } });
    await runSetup(context, base, SETUP_PAYLOAD, 0);
    const exhausted = await newPage(context, { role: 'ui' });
    await exhausted.goto(`${base}/block.html`);
    await exhausted.getByText('Screen time used up').waitFor();
    await exhausted.screenshot({ path: join(shots, 'block-exhausted.png') });

    await setState(exhausted, 's.debtMs = 20*60000; s.debtOriginMs = 20*60000; s.debtSince = Date.now();');
    await exhausted.getByText('DEBT MODE', { exact: true }).waitFor();
    expect((await exhausted.locator('body').innerText()).includes('You owe 20m 00s'), 'debt amount on block page');
    await exhausted.screenshot({ path: join(shots, 'block-debt.png') });

    await exhausted.goto(`${base}/block.html?reason=extensions&target=chrome%3A%2F%2Fextensions%2F`);
    await exhausted.getByText('Extension settings are protected').waitFor();
    await exhausted.getByRole('button', { name: 'Continue to Chrome settings' }).waitFor();
    expect(
      (await exhausted.locator('body').innerText()).includes('Chrome prevents extensions from completely controlling privileged chrome:// pages.'),
      'exact wording on extensions confirmation page',
    );

    await exhausted.goto(`${base}/block.html?reason=motivation`);
    await exhausted.getByRole('heading', { name: /Bro\/Sis|Did you forget why you started|Time can't be bought|Your future self/ }).waitFor();
    await exhausted.getByRole('link', { name: 'Back to my goal' }).waitFor();
    const motivationText = await exhausted.locator('body').innerText();
    expect(!motivationText.toLowerCase().includes('block'), 'motivation page does not mention the intervention');
    expect(!motivationText.includes('Balance'), 'motivation page hides wallet details');
    await context.close();
  });

  await test('YouTube: a mode must be chosen; search shows every channel and Shorts', async () => {
    const context = await youtubeContext(browser);
    await runSetup(context, 'https://www.youtube.com', SETUP_PAYLOAD, 20);
    const page = await newPage(context, { role: 'content', withContent: true, tab: 11 });
    await page.goto('https://www.youtube.com/results?search_query=jee');
    await page.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).waitFor();
    await page.screenshot({ path: join(shots, 'youtube-chooser.png') });
    await page.locator('[data-et-mode="productive"]').click();
    await page.waitForFunction(() => (document.getElementById('earntime-root')?.shadowRoot?.textContent ?? '').includes('EarnTime · Productive Mode'));
    await page.locator('#shorts-shelf a').waitFor({ state: 'visible' });
    const visibility = await page.evaluate(() => ({
      study: getComputedStyle(document.querySelector('#study-video')).display,
      random: getComputedStyle(document.querySelector('#random-video')).display,
      nameless: getComputedStyle(document.querySelector('#nameless-video')).display,
      shorts: getComputedStyle(document.querySelector('#shorts-shelf')).display,
    }));
    expect(visibility.study !== 'none', 'PW Live result is visible');
    expect(visibility.random !== 'none', 'unproductive-channel results stay in search; they are judged at play time');
    expect(visibility.nameless !== 'none', 'unreadable-channel results stay in search');
    expect(visibility.shorts !== 'none', 'Shorts shelf stays visible in search');
    expect(await page.locator('#shorts-link').isVisible(), 'Shorts links are visible and clickable');
    expect(await page.locator('#modern-shorts-link').isVisible(), 'modern Shorts cards also stay visible');
    await page.screenshot({ path: join(shots, 'youtube-results.png') });
    expect(page.__errors.length === 0, `no page errors: ${page.__errors.join('; ')}`);
    await context.close();
  });

  await test('YouTube: clicking a search Short opens a visible player that receives video frames', async () => {
    const context = await youtubeContext(browser);
    try {
      await runSetup(context, 'https://www.youtube.com', SETUP_PAYLOAD, 20);
      const page = await newPage(context, { role: 'content', withContent: true, tab: 17 });
      await page.goto('https://www.youtube.com/results?search_query=jee');
      await page.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).waitFor();
      await page.locator('[data-et-mode="productive"]').click();
      await page.locator('#shorts-link').click();
      await page.waitForURL('https://www.youtube.com/shorts/study-short');
      await page.locator('#short-player').waitFor({ state: 'visible' });
      expect(await page.getByRole('dialog').count() === 0, 'study Short has no cover or second mode chooser');
      await playFixtureShort(page);
      expect(await page.locator('#short-player').isVisible(), 'playing video has no hidden ancestors');
      expect(page.__errors.length === 0, `no page errors: ${page.__errors.join('; ')}`);
      await page.screenshot({ path: join(shots, 'youtube-shorts.png') });
    } finally {
      await context.close();
    }
  });

  await test('YouTube: swiping rechecks the active Short and pauses non-study playback', async () => {
    const context = await youtubeContext(browser);
    try {
      await runSetup(context, 'https://www.youtube.com', SETUP_PAYLOAD, 20);
      const page = await newPage(context, { role: 'content', withContent: true, tab: 18 });
      await page.goto('https://www.youtube.com/shorts/study-short');
      await page.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).waitFor();
      await page.locator('[data-et-mode="productive"]').click();
      await playFixtureShort(page);
      // YouTube can change just the active attribute before updating its URL or replacing nodes.
      await page.evaluate(() => {
        document.querySelector('#study-reel').removeAttribute('is-active');
        document.querySelector('#random-reel').setAttribute('is-active', '');
      });
      await page.getByRole('dialog', { name: 'Shorts are off' }).waitFor();
      expect(await page.evaluate(() => document.querySelector('#short-player').paused), 'covered media is actually paused');
      await page.waitForFunction(async () => (await chrome.storage.local.get('state')).state?.live?.why === 'filter-covered');
      expect((await overlayText(page)).includes('Random Vlogs'), 'only the active channel is checked, not the prefetched study reel');
      // Even with the gate open, a blocking card's actions must remain usable.
      await page.getByRole('button', { name: 'Study search', exact: true }).click();
      await page.waitForURL('**/results?search_query=JEE');
      await page.locator('#shorts-link').waitFor({ state: 'visible' });
      expect(page.__errors.length === 0, `no page errors: ${page.__errors.join('; ')}`);
    } finally {
      await context.close();
    }
  });

  await test('YouTube: switching to Unproductive Mode clears a Shorts cover and allows playback', async () => {
    const context = await youtubeContext(browser);
    try {
      await runSetup(context, 'https://www.youtube.com', SETUP_PAYLOAD, 20);
      const page = await newPage(context, { role: 'content', withContent: true, tab: 19 });
      await page.goto('https://www.youtube.com/shorts/study-short');
      await page.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).waitFor();
      await page.locator('[data-et-mode="productive"]').click();
      await playFixtureShort(page);
      await page.evaluate(() => {
        document.querySelector('#study-reel').removeAttribute('is-active');
        document.querySelector('#random-reel').setAttribute('is-active', '');
      });
      await page.getByRole('dialog', { name: 'Shorts are off' }).waitFor();
      // Exercise the real worker's mode change and the content script's storage-change teardown.
      await page.evaluate(async () => {
        const reply = await chrome.runtime.sendMessage({ type: 'page.choose', url: location.href, mode: 'unproductive' });
        if (!reply.ok) throw new Error('Unproductive Mode was refused');
      });
      await page.waitForFunction(() => (document.getElementById('earntime-root')?.shadowRoot?.textContent ?? '').includes('EarnTime · Unproductive Mode'));
      expect(await page.getByRole('dialog').count() === 0, 'the old Productive Mode cover is removed');
      await playFixtureShort(page, '#random-player');
      expect(await page.locator('#random-player').isVisible(), 'non-study Shorts remain visible and play in Unproductive Mode');
      expect(page.__errors.length === 0, `no page errors: ${page.__errors.join('; ')}`);
    } finally {
      await context.close();
    }
  });

  await test('YouTube: the homepage shows no videos and no banner', async () => {
    const context = await youtubeContext(browser);
    await runSetup(context, 'https://www.youtube.com', SETUP_PAYLOAD, 20);
    const page = await newPage(context, { role: 'content', withContent: true, tab: 12 });
    await page.goto('https://www.youtube.com/results?search_query=study');
    await page.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).waitFor();
    await page.locator('[data-et-mode="productive"]').click();
    await page.getByText('Productive Mode').first().waitFor();
    await page.goto('https://www.youtube.com/');
    await page.waitForFunction(() => document.querySelector('#feed-item')?.style.display === 'none');
    expect((await overlayText(page)).includes('Study search') === false, 'no study-search banner over the homepage');
    expect((await overlayText(page)).includes('Not available in Productive Mode') === false, 'no blocking cover either');
    await page.screenshot({ path: join(shots, 'youtube-home.png') });
    await context.close();
  });

  await test('YouTube: a watch page from another channel is closed; a keyword channel is not', async () => {
    const context = await youtubeContext(browser);
    await runSetup(context, 'https://www.youtube.com', SETUP_PAYLOAD, 20);
    const page = await newPage(context, { role: 'content', withContent: true, tab: 13 });
    await page.goto('https://www.youtube.com/watch?v=vlog1');
    await page.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).waitFor();
    await page.locator('[data-et-mode="productive"]').click();
    await page.getByText('Not on your study list').waitFor();
    // Covered content is not study time: the live status must report the intentional cover.
    await page.waitForFunction(async () => {
      const values = await chrome.storage.local.get('state');
      return values.state?.live?.why === 'filter-covered';
    }, null, { timeout: 10000 });
    expect(
      (await overlayText(page)).includes('not charged or credited'),
      'covered watch page says its time is not charged or credited',
    );
    // Moving to another video on the same site keeps the tab's Productive Mode (no second prompt).
    await page.goto('https://www.youtube.com/watch?v=study-1');
    await page.waitForFunction(() => (document.getElementById('earntime-root')?.shadowRoot?.textContent ?? '').includes('Productive Mode'));
    await page.waitForTimeout(600);
    expect((await page.getByText('Not on your study list').count()) === 0, 'study channel is not closed');
    expect((await page.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).count()) === 0, 'no second prompt on the same site');
    await context.close();
  });

  await test('YouTube: Unproductive Mode is disabled while the balance is empty, and chosen mode never greys the page', async () => {
    const empty = await youtubeContext(browser);
    await runSetup(empty, 'https://www.youtube.com', SETUP_PAYLOAD, 0);
    const emptyPage = await newPage(empty, { role: 'content', withContent: true, tab: 14 });
    await emptyPage.goto('https://www.youtube.com/results?search_query=jee');
    await emptyPage.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).waitFor();
    expect(await emptyPage.locator('[data-et-mode="unproductive"]').isDisabled(), 'unproductive option disabled at zero balance');
    await emptyPage.screenshot({ path: join(shots, 'youtube-chooser-empty.png') });
    await empty.close();

    const funded = await youtubeContext(browser);
    await runSetup(funded, 'https://www.youtube.com', SETUP_PAYLOAD, 20);
    const page = await newPage(funded, { role: 'content', withContent: true, tab: 15 });
    await page.goto('https://www.youtube.com/results?search_query=jee');
    await page.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).waitFor();
    await page.locator('[data-et-mode="unproductive"]').click();
    await page.waitForFunction(() => (document.getElementById('earntime-root')?.shadowRoot?.textContent ?? '').includes('EarnTime · Unproductive Mode'), null, { timeout: 10000 });
    const filter = await page.evaluate(() => getComputedStyle(document.documentElement).filter);
    expect(!filter.includes('grayscale'), `no greyscale in Unproductive Mode (got ${filter || 'none'})`);
    expect((await overlayText(page)).includes('EarnTime · Unproductive Mode'), 'banner shows Unproductive Mode');
    await funded.close();
  });

  await test('YouTube: a missing layout fails closed after the grace period', async () => {
    const context = await browser.newContext();
    await context.route('https://www.youtube.com/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/__setup') return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>setup</body></html>' });
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body><div>changed layout</div></body></html>' });
    });
    await runSetup(context, 'https://www.youtube.com', SETUP_PAYLOAD, 20);
    const page = await newPage(context, { role: 'content', withContent: true, tab: 16 });
    await page.goto('https://www.youtube.com/results?search_query=jee');
    await page.getByRole('dialog', { name: /How to use (?:www\.)?youtube\.com/ }).waitFor();
    await page.locator('[data-et-mode="productive"]').click();
    await page.getByText('YouTube layout not recognised').waitFor({ timeout: 15000 });
    await context.close();
  });

  await test('popup: completing a task pays the reward once', async () => {
    const context = await browser.newContext({ viewport: { width: 400, height: 800 } });
    await runSetup(context, base, { ...SETUP_PAYLOAD, tasks: [{ title: 'Revise formulas', rewardMin: 5, recurring: true }] }, 0);
    const page = await newPage(context, { role: 'ui' });
    await page.goto(`${base}/popup.html`);
    await page.getByLabel('Mark "Revise formulas" done').click();
    await page.waitForFunction(async () => (await chrome.storage.local.get('state')).state.balanceMs === 5 * 60000);
    await page.getByLabel('Mark "Revise formulas" done').click();
    await page.getByLabel('Mark "Revise formulas" done').click();
    const balance = await page.evaluate(async () => (await chrome.storage.local.get('state')).state.balanceMs);
    expect(balance === 5 * 60000, `no second reward (balance ${balance})`);
    await context.close();
  });
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} browser tests passed`);
process.exit(failed.length ? 1 : 0);
