import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage();

for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet',  width: 900,  height: 900 },
  { name: 'mobile',  width: 390,  height: 844 },
]) {
  await page.setViewport({ width: vp.width, height: vp.height });
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('yp-splash-seen', '1'));
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => document.getElementById('register')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `/tmp/bookshelf-${vp.name}.png` });
  console.log(`captured ${vp.name} at ${vp.width}x${vp.height}`);
}
await browser.close();
