/**
 * Comprehensive mobile audit — captures the top nav + hero at multiple
 * viewport widths and reports any layout issues (horizontal overflow,
 * element overlaps, hidden interactive elements, missing logo, etc.).
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT    = '/tmp/mobile-audit';
await fs.mkdir(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'android-small',    width: 360, height: 780 },
  { name: 'iphone-se',        width: 375, height: 667 },
  { name: 'iphone-13-pro',    width: 390, height: 844 },
  { name: 'iphone-14-pro-max',width: 430, height: 932 },
  { name: 'ipad-mini',        width: 768, height: 1024 },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

const overall = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
  );
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: 2,
    isMobile: vp.width < 768,
    hasTouch: vp.width < 768,
  });

  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 500));

  /* ── 1. Check horizontal overflow on document root ── */
  const overflow = await page.evaluate(() => {
    const docWidth  = document.documentElement.scrollWidth;
    const winWidth  = window.innerWidth;
    return { docWidth, winWidth, overflows: docWidth > winWidth };
  });

  /* ── 2. Inspect top nav: BrandMark, BlackOak logo, divider, Chapter, Register ── */
  const nav = await page.evaluate(() => {
    const brandMark  = document.querySelector('section:first-of-type > div.relative.z-20 .inline-flex.items-center.gap-3');
    const bkLink     = document.querySelector('a[aria-label="BlackOak Real Estate"]');
    const bkImg      = bkLink?.querySelector('img');
    const chapterBadge = document.querySelector('section:first-of-type span.inline-flex.items-center.gap-3.text-\\[10px\\]');
    const registerLink = document.querySelector('section:first-of-type a[href="#register"]');

    const bounds = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top:    Math.round(r.top),
        left:   Math.round(r.left),
        right:  Math.round(r.right),
        width:  Math.round(r.width),
        height: Math.round(r.height),
        display: cs.display,
        visible: cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0,
      };
    };

    return {
      brandMark:  bounds(brandMark),
      bkLink:     bounds(bkLink),
      bkImg:      bounds(bkImg),
      bkImgSrc:   bkImg?.currentSrc || null,
      chapterBadge: bounds(chapterBadge),
      registerLink: bounds(registerLink),
    };
  });

  /* ── 3. Check if BrandMark and BlackOak logo overlap ── */
  let overlap = null;
  if (nav.brandMark && nav.bkLink && nav.bkLink.visible) {
    overlap = nav.brandMark.right > nav.bkLink.left;
  }

  /* ── 4. Screenshot the top nav area ── */
  await page.screenshot({
    path: `${OUT}/${vp.name}-hero.png`,
    clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 400) },
  });

  /* ── 5. Full viewport screenshot ── */
  await page.screenshot({
    path: `${OUT}/${vp.name}-full.png`,
    fullPage: false,
  });

  const result = {
    viewport: `${vp.name} (${vp.width}×${vp.height})`,
    overflow,
    brandMarkVisible:  nav.brandMark?.visible ?? false,
    blackoakVisible:   nav.bkLink?.visible ?? false,
    chapterBadgeShown: nav.chapterBadge?.visible ?? false,
    registerShown:     nav.registerLink?.visible ?? false,
    overlap,
    layoutSummary: {
      brandMarkRight: nav.brandMark?.right,
      blackoakLeft:   nav.bkLink?.left,
      blackoakWidth:  nav.bkLink?.width,
      blackoakSrc:    nav.bkImgSrc,
    },
  };
  overall.push(result);
  console.log(`\n${result.viewport}`);
  console.log(`  h-overflow: ${overflow.overflows ? '❌ ' + (overflow.docWidth - overflow.winWidth) + 'px' : '✅ none'}`);
  console.log(`  BrandMark visible: ${result.brandMarkVisible ? '✅' : '❌'} (${nav.brandMark?.width}px wide)`);
  console.log(`  BlackOak logo visible: ${result.blackoakVisible ? '✅' : '❌'}${nav.bkLink ? ` (${nav.bkLink.width}×${nav.bkLink.height}px)` : ''}`);
  console.log(`  Chapter badge shown: ${result.chapterBadgeShown ? 'yes' : 'no'}`);
  console.log(`  Register link shown: ${result.registerShown ? 'yes' : 'no'}`);
  console.log(`  Nav overlap: ${overlap === null ? 'n/a' : overlap ? '❌ elements overlap' : '✅ no overlap'}`);

  await page.close();
}

console.log('\n────── FULL AUDIT ──────');
for (const r of overall) {
  const ok = !r.overflow.overflows && r.brandMarkVisible && (r.blackoakVisible || r.viewport.startsWith('android-small'));
  console.log(`  ${ok ? '✅' : '❌'}  ${r.viewport}`);
}

await fs.writeFile(`${OUT}/report.json`, JSON.stringify(overall, null, 2));
await browser.close();
console.log(`\nScreenshots: ${OUT}`);
