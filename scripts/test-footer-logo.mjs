import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT    = '/tmp/footer-logo';
await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle2', timeout: 30000 });

/* Scroll to the very bottom so the footer is visible */
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await new Promise((r) => setTimeout(r, 800));

/* Check what the DOM shows for the logo */
const diag = await page.evaluate(() => {
  const footer = document.querySelector('footer');
  const picture = footer?.querySelector('picture');
  const img = picture?.querySelector('img');
  const link = img?.closest('a');
  const footerRect = footer?.getBoundingClientRect();
  const imgRect = img?.getBoundingClientRect();
  const cs = img ? getComputedStyle(img) : null;
  return {
    footerFound: !!footer,
    footerRectTop: footerRect ? Math.round(footerRect.top) : null,
    footerRectHeight: footerRect ? Math.round(footerRect.height) : null,
    footerVisible: footerRect ? (footerRect.top < window.innerHeight && footerRect.bottom > 0) : false,
    pictureFound: !!picture,
    imgFound: !!img,
    imgSrc: img?.src || null,
    imgCurrentSrc: img?.currentSrc || null,
    imgNaturalWidth: img?.naturalWidth,
    imgNaturalHeight: img?.naturalHeight,
    imgComputedWidth: cs?.width,
    imgComputedHeight: cs?.height,
    imgComputedFilter: cs?.filter,
    imgComputedOpacity: cs?.opacity,
    imgRectTop: imgRect ? Math.round(imgRect.top) : null,
    imgRectLeft: imgRect ? Math.round(imgRect.left) : null,
    imgRectWidth: imgRect ? Math.round(imgRect.width) : null,
    imgRectHeight: imgRect ? Math.round(imgRect.height) : null,
    linkHref: link?.href || null,
    footerHTMLPreview: footer?.innerHTML?.slice(0, 200) || null,
  };
});

console.log(JSON.stringify(diag, null, 2));

await page.screenshot({ path: `${OUT}/full-viewport.png`, fullPage: false });
if (diag.footerRectTop != null) {
  await page.screenshot({
    path: `${OUT}/footer-crop.png`,
    clip: {
      x: 0,
      y: Math.max(0, diag.footerRectTop - 20),
      width: 1280,
      height: Math.min(900 - Math.max(0, diag.footerRectTop - 20), diag.footerRectHeight + 40),
    },
  });
}

await browser.close();
console.log(`\nScreenshots: ${OUT}`);
