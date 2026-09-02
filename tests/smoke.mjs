/**
 * End-to-end smoke test.
 *
 * Walks the whole experience the way a person would — preload, tap, watch the
 * reveal, tap the key, ride the drive, arrive, replay — and asserts the things
 * that would be invisible in a unit test: that the scene machine actually
 * advances, that repeated taps cannot double-fire, that the canvas is painting
 * rather than sitting blank, and that replay genuinely returns to the start.
 *
 *   node tests/smoke.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5301/';

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '393x852', width: 393, height: 852 },
  { name: '412x915', width: 412, height: 915 },
  { name: '430x932', width: 430, height: 932 },
  { name: 'desktop 1440x900', width: 1440, height: 900 },
];

let failures = 0;
const ok = (condition, message) => {
  console.log(`  ${condition ? '✓' : '✗'} ${message}`);
  if (!condition) failures++;
};

const sceneOf = (page) =>
  page.getAttribute('.experience', 'data-scene').then((v) => v ?? 'unknown');

/** Mean luminance of the canvas: proves something is actually being drawn. */
const canvasBrightness = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('.stage-canvas');
    if (!canvas) return -1;
    const probe = document.createElement('canvas');
    probe.width = 60;
    probe.height = 100;
    const ctx = probe.getContext('2d');
    ctx.drawImage(canvas, 0, 0, 60, 100);
    const { data } = ctx.getImageData(0, 0, 60, 100);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return sum / (data.length / 4);
  });

async function run(browser, viewport) {
  const isDesktop = viewport.width > 900;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: isDesktop ? 1 : 2,
    isMobile: !isDesktop,
    hasTouch: !isDesktop,
  });
  const page = await context.newPage();

  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) =>
    problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`),
  );

  console.log(`\n=== ${viewport.name}`);
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // 1. Preload finishes and the opening becomes interactive.
  await page.waitForSelector('[data-testid=opening-cta]:not([disabled])', { timeout: 30000 });
  ok((await sceneOf(page)) === 'OPENING', 'preload completes and the opening appears');
  ok((await canvasBrightness(page)) > 4, 'the scene is painted, not blank');

  const documentScrolls = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  });
  ok(!documentScrolls, 'the page does not scroll');

  // Copy is live text, not baked into the art.
  ok((await page.textContent('.headline')).trim() === 'Hello Madam', 'opening headline is live text');

  // 2. The opening CTA starts the reveal, and repeats cannot double-fire it.
  await page.click('[data-testid=opening-cta]', { force: true });
  await page.click('[data-testid=opening-cta]', { force: true }).catch(() => {});
  await page.waitForTimeout(120);
  ok((await sceneOf(page)) === 'REVEAL', 'the CTA moves to the reveal, and a second tap is ignored');

  // 3. The reveal plays through to the key with no further interaction.
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.scene === 'KEY', null, { timeout: 15000 });
  ok(true, 'the reveal runs automatically and hands over to the key');
  ok(await page.isEnabled('[data-testid=key-hit]'), 'the key is independently tappable');

  // 4. The key: three rapid taps must produce exactly one transition.
  await page.click('[data-testid=key-hit]', { force: true });
  await page.click('[data-testid=key-hit]', { force: true }).catch(() => {});
  await page.click('[data-testid=key-hit]', { force: true }).catch(() => {});
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.scene === 'DRIVING', null, { timeout: 15000 });
  ok(true, 'the key starts the drive');
  // The destination chip and caption card were removed from the driving scene;
  // its headline is the only copy left there.
  ok(
    (await page.textContent('.overlay-block:not(.overlay-block-wide) .headline-sm')).trim().length > 0,
    'the driving scene shows its headline',
  );

  // The world must actually be moving.
  const before = await page.evaluate(() => window.__firstDriveRoadOffset ?? 0);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__firstDriveRoadOffset ?? 0);
  ok(before !== after, 'the road is scrolling');

  // 5. Arrival.
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.scene === 'ARRIVAL', null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.scene === 'COMPLETE', null, { timeout: 30000 });
  ok(
    (await page.getAttribute('.overlay-block-wide', 'data-hidden')) === 'true',
    'the parked card replaces the arrival copy',
  );

  const body = (await page.textContent('body')).toLowerCase();
  ok(!body.includes('drive to work'), 'nothing claims she drove straight to work');

  // 6. Replay returns to the start.
  await page.click('[data-testid=replay]', { force: true });
  await page.waitForFunction(() => document.querySelector('.experience')?.dataset.scene === 'OPENING', null, { timeout: 10000 });
  ok(true, 'replay returns to the opening');
  ok(
    await page.isEnabled('[data-testid=opening-cta]'),
    'the opening CTA works again after a replay',
  );
  ok(
    !(await page.isEnabled('[data-testid=key-hit]')),
    'the key is locked again after a replay',
  );

  ok(problems.length === 0, `no console or network errors${problems.length ? `: ${problems.join(' | ')}` : ''}`);

  await context.close();
}

const browser = await chromium.launch();
for (const viewport of VIEWPORTS) {
  await run(browser, viewport);
}
await browser.close();

console.log(`\n${failures === 0 ? 'SMOKE TEST PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
