/**
 * Drive the stack-deck scroll effect on a mobile viewport (iPhone 13 Pro
 * size: 390x844) and capture a screenshot at each transition point to
 * visually verify smooth stacking + scale-down.
 *
 * Also inspects computed CSS on each section to confirm the sticky
 * positioning, GPU-compositing transform, and scale variable are applied.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT    = '/tmp/mobile-stack';
await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

const page = await browser.newPage();

/* iPhone 13 Pro viewport + mobile UA + touch */
await page.setUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
);
await page.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

await page.goto('http://localhost:4321/', { waitUntil: 'networkidle2', timeout: 30000 });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const shot = async (file) => {
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: false });
};

/* Grab computed CSS + measured position of every stack section. */
const inspectStack = async () => {
  return page.evaluate(() => {
    const sections = Array.from(
      document.querySelectorAll('main.stack > section')
    );
    return sections.map((s, i) => {
      const cs = getComputedStyle(s);
      const r  = s.getBoundingClientRect();
      const scaleVar   = s.style.getPropertyValue('--stack-scale');
      const opacityVar = s.style.getPropertyValue('--stack-opacity');
      return {
        index:      i,
        id:         s.id || '(none)',
        firstClass: s.className.split(' ')[0],
        position:   cs.position,
        minHeight:  cs.minHeight,
        zIndex:     cs.zIndex,
        transform:  cs.transform,       // computed matrix
        opacity:    cs.opacity,
        scaleVar:   scaleVar || '(unset)',
        opacityVar: opacityVar || '(unset)',
        rectTop:    Math.round(r.top),
        rectHeight: Math.round(r.height),
      };
    });
  });
};

/* Scroll positions to test. 844 = one viewport on iPhone 13 Pro. */
const scrollTargets = [0, 400, 844, 1300, 1900, 2400, 3200, 4000, 4800, 5600, 6400, 7200, 8000, 8800];

const report = [];

for (const y of scrollTargets) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await wait(400); // let the scroll listener + rAF fire, let CSS transitions settle
  const stack = await inspectStack();
  const file  = `scroll-${String(y).padStart(4, '0')}.png`;
  await shot(file);

  /* Find the currently pinned card (rectTop within [0, 20]) */
  const pinned = stack.find((s) => s.rectTop >= -5 && s.rectTop <= 20);
  const belowPinned = stack.filter((s) => s.rectTop < -5);
  report.push({
    scroll:  y,
    file,
    pinned:  pinned  ? { id: pinned.id, class: pinned.firstClass, scale: pinned.scaleVar, opacity: pinned.opacityVar, transform: pinned.transform } : null,
    buried:  belowPinned.map((s) => ({ id: s.id, class: s.firstClass, scale: s.scaleVar, opacity: s.opacityVar })),
  });
}

/* Also inspect the very first section (Hero) at scroll 0 for sanity */
console.log('\n─── At scroll = 0 (Hero pinned) ───');
const initial = await inspectStack();
initial.slice(0, 3).forEach((s) => {
  console.log(`  [${s.index}] ${s.id || s.firstClass}: position=${s.position}, minH=${s.minHeight}, z=${s.zIndex}, transform=${s.transform.slice(0, 60)}...`);
});

console.log('\n─── Scroll transition summary ───');
for (const r of report) {
  const p = r.pinned;
  console.log(`  scroll=${String(r.scroll).padStart(4)}  →  pinned: ${p ? p.id || p.class : '(none)'}   scale=${p?.scale || '-'}   buried behind: ${r.buried.length}`);
}

await fs.writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));

/* Verify GPU compositing hint present */
const gpuHints = await page.evaluate(() => {
  const s = document.querySelector('main.stack > section');
  const cs = s ? getComputedStyle(s) : null;
  return cs ? {
    transformHasTranslate:  cs.transform !== 'none',
    backfaceHidden:         cs.backfaceVisibility === 'hidden',
    willChange:             cs.willChange,
  } : null;
});
console.log('\n─── GPU compositing hints ───');
console.log('  ', gpuHints);

await browser.close();
console.log(`\nScreenshots: ${OUT}`);
