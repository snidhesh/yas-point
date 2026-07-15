/**
 * Bake permanent dark bands into each reference JPEG so the "YAS POINT"
 * wordmark and the burned-in taglines are physically removed from the
 * image file. The runtime CSS scrims stay as belt-and-suspenders.
 *
 * Run once (or after replacing any source in assets/):
 *   node scripts/clean-images.mjs
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const files = [
  { src: '1.jpeg', dest: 'garden.jpeg' },
  { src: '2.jpeg', dest: 'lights.jpeg' },
  { src: '3.jpeg', dest: 'marina.jpeg' },
  { src: '4.jpeg', dest: 'horizon.jpeg' },
  { src: '5.jpeg', dest: 'tide.jpeg' },
  { src: '6.jpeg', dest: 'beach.jpeg' },
];

/* Where the burned-in text actually sits, as fraction of image height.
   Measured across all six reference images:
     wordmark ("YAS POINT"):  ~8%  → ~26% of height
     tagline (three lines):   ~52% → ~74% of height
   Bands include ~2-3% padding at each edge to be safe. */
const WORDMARK_TOP    = 0.06;
const WORDMARK_BOTTOM = 0.28;
const TAGLINE_TOP     = 0.50;
const TAGLINE_BOTTOM  = 0.76;

const outDir = path.join(ROOT, 'public', 'images');
await fs.mkdir(outDir, { recursive: true });

for (const { src, dest } of files) {
  const srcPath  = path.join(ROOT, 'assets', src);
  const destPath = path.join(outDir, dest);

  const image = sharp(srcPath);
  const meta = await image.metadata();
  const w = meta.width  ?? 338;
  const h = meta.height ?? 600;

  const wordmarkH = Math.round((WORDMARK_BOTTOM - WORDMARK_TOP) * h);
  const taglineH  = Math.round((TAGLINE_BOTTOM  - TAGLINE_TOP)  * h);
  const wordmarkY = Math.round(WORDMARK_TOP * h);
  const taglineY  = Math.round(TAGLINE_TOP  * h);

  /* SVG gradients that fade from near-black at the center of each text band
     to slightly translucent at the outer edges — so the "band" reads as a
     shadowed area of the composition, not a hard rectangle. */
  const wordmarkBand = Buffer.from(`
    <svg width="${w}" height="${wordmarkH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0"    stop-color="#000000" stop-opacity="1.00"/>
          <stop offset="0.72" stop-color="#000000" stop-opacity="1.00"/>
          <stop offset="1.00" stop-color="#000000" stop-opacity="0.00"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>
  `);

  const taglineBand = Buffer.from(`
    <svg width="${w}" height="${taglineH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0.00" stop-color="#000000" stop-opacity="0.00"/>
          <stop offset="0.22" stop-color="#000000" stop-opacity="1.00"/>
          <stop offset="0.78" stop-color="#000000" stop-opacity="1.00"/>
          <stop offset="1.00" stop-color="#000000" stop-opacity="0.00"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>
  `);

  await image
    .composite([
      { input: wordmarkBand, top: wordmarkY, left: 0, blend: 'over' },
      { input: taglineBand,  top: taglineY,  left: 0, blend: 'over' },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(destPath);

  const stat = await fs.stat(destPath);
  console.log(`✓ ${src} → images/${dest}   ${w}×${h}   ${(stat.size / 1024).toFixed(1)} KB`);
}

console.log('\nAll reference images cleaned. The raw JPEGs no longer contain readable "YAS POINT" wordmarks or taglines.');
