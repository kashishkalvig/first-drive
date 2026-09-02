/**
 * Reduced-motion check: the same story, the same beats, in less time.
 *
 *   node tests/reduced-motion.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5301/';
let failures = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) failures++; };

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });

const scene = () => page.getAttribute('.experience', 'data-scene');
const waitScene = (name, timeout = 20000) =>
  page.waitForFunction(
    (n) => document.querySelector('.experience')?.dataset.scene === n,
    name,
    { timeout },
  );

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid=opening-cta]:not([disabled])', { timeout: 30000 });
ok((await scene()) === 'OPENING', 'opening still appears');

const start = Date.now();
await page.click('[data-testid=opening-cta]', { force: true });
await waitScene('KEY');
ok(true, 'the reveal still happens — it is shortened, not removed');

await page.click('[data-testid=key-hit]', { force: true });
await waitScene('DRIVING');
ok(true, 'the key still starts the drive');

await waitScene('ARRIVAL', 30000);
await waitScene('COMPLETE', 30000);
const elapsed = Date.now() - start;
ok(true, `the finale is reached in ${(elapsed / 1000).toFixed(1)}s`);
ok(elapsed < 14000, 'the whole sequence is shortened under reduced motion');

ok(
  (await page.textContent('.headline-finale')).trim() === 'Made it, Madam.',
  'the final composition and message are preserved',
);

// Nothing should still be looping once she has arrived.
const before = await page.evaluate(() => window.__firstDriveRoadOffset ?? 0);
await page.waitForTimeout(700);
const after = await page.evaluate(() => window.__firstDriveRoadOffset ?? 0);
ok(before === after, 'parallax has stopped at the arrival');

ok(problems.length === 0, `no errors${problems.length ? `: ${problems.join(' | ')}` : ''}`);

await browser.close();
console.log(`\n${failures === 0 ? 'REDUCED MOTION PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
