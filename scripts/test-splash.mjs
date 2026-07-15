/**
 * Capture the splash-screen animation at multiple moments so we can
 * verify the reveal / hold / dismiss sequence visually.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT    = '/tmp/splash';
await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

for (const vp of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile',  width: 390,  height: 844 },
]) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });

  /* Reset sessionStorage each time so the splash actually shows. */
  await page.evaluateOnNewDocument(() => {
    sessionStorage.clear();
  });

  await page.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 30000 });

  const shot = async (ms, label) => {
    await new Promise((r) => setTimeout(r, ms));
    await page.screenshot({ path: `${OUT}/${vp.name}-${label}.png` });
  };

  /* Grab frames at each key moment of the 2.4s splash lifetime. */
  await shot(50,   '01-initial');
  await shot(500,  '02-mark-fading-in');
  await shot(1200, '03-full-hold');
  await shot(1800, '04-fading-out');
  await shot(2600, '05-dismissed');

  /* Check the splash was actually removed after 2400ms. */
  const isGone = await page.evaluate(() => !document.getElementById('splash'));
  const seen   = await page.evaluate(() => sessionStorage.getItem('yp-splash-seen'));
  console.log(`\n[${vp.name}] splash removed: ${isGone ? '✅' : '❌'}  sessionStorage yp-splash-seen: ${seen}`);

  await page.close();
}

await browser.close();
console.log(`\nScreenshots: ${OUT}`);
