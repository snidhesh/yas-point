import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.evaluateOnNewDocument(() => sessionStorage.setItem('yp-splash-seen', '1'));

page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto('http://localhost:4321/', { waitUntil: 'networkidle2', timeout: 30000 });

/* 1. Confirm target sections exist and get their positions */
const targets = await page.evaluate(() => {
  const ids = ['chapter-01', 'chapter-02', 'chapter-03', 'chapter-04', 'chapter-05', 'chapter-06'];
  return ids.map((id) => {
    const el = document.getElementById(id);
    return { id, exists: !!el, top: el ? el.getBoundingClientRect().top + window.scrollY : null };
  });
});
console.log('\n─── Chapter section positions ───');
targets.forEach((t) => console.log(`  ${t.id}: exists=${t.exists}, natural top=${t.top}`));

/* 2. Confirm spine links are present */
const spines = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.spine[href^="#chapter-"]')).map((a) => ({
    href: a.getAttribute('href'),
    hasSpineClass: a.classList.contains('spine'),
    rect: a.getBoundingClientRect(),
  })).map((s) => ({ ...s, visible: s.rect.width > 0 && s.rect.height > 0 }));
});
console.log('\n─── Spine links ───');
spines.forEach((s) => console.log(`  ${s.href}: visible=${s.visible}, size=${Math.round(s.rect.width)}x${Math.round(s.rect.height)}, top=${Math.round(s.rect.top)}`));

/* 3. Scroll to register section so spines are in view */
await page.evaluate(() => document.getElementById('register')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
await new Promise((r) => setTimeout(r, 500));

const scrollBefore = await page.evaluate(() => window.scrollY);
console.log(`\n[scroll before click] ${scrollBefore}`);

/* 4. Manually compute what the handler SHOULD do */
const debug = await page.evaluate(() => {
  const target = document.querySelector('#chapter-02');
  if (!target) return { error: 'target not found' };
  let node = target;
  let sum = 0;
  const chain = [];
  while (node) {
    chain.push({ tag: node.tagName, id: node.id || '', offsetTop: node.offsetTop, hasOffsetParent: !!node.offsetParent });
    sum += node.offsetTop;
    node = node.offsetParent;
  }
  return {
    targetTagName: target.tagName,
    targetId: target.id,
    computedOffsetTop: target.offsetTop,
    computedOffsetHeight: target.offsetHeight,
    walkedSum: sum,
    chain,
    bodyScrollHeight: document.body.scrollHeight,
    docScrollHeight: document.documentElement.scrollHeight,
  };
});
console.log('\n─── Debug: offsetTop calc for #chapter-02 ───');
console.log(JSON.stringify(debug, null, 2));

/* 5. Click each chapter spine one after another and verify scroll position */
for (const chapterNum of ['01', '02', '03', '04', '05', '06']) {
  /* Reset scroll to register */
  await page.evaluate(() => document.getElementById('register')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await new Promise((r) => setTimeout(r, 300));

  /* Click the spine */
  await page.evaluate((n) => {
    const link = document.querySelector(`.spine[href="#chapter-${n}"]`);
    if (link) link.click();
  }, chapterNum);
  await new Promise((r) => setTimeout(r, 1500));

  const scrolled = await page.evaluate(() => window.scrollY);
  const expected = targets.find((t) => t.id === `chapter-${chapterNum}`)?.top;
  const ok = Math.abs(scrolled - expected) < 5;
  console.log(`  chapter-${chapterNum}: expected ~${expected}, got ${scrolled}  ${ok ? '✅' : '❌'}`);
}

const scrollAfter = await page.evaluate(() => window.scrollY);
console.log(`[scroll after click] ${scrollAfter}`);
console.log(`[scroll diff] ${scrollAfter - scrollBefore}`);

const url = page.url();
console.log(`[url] ${url}`);

await browser.close();
