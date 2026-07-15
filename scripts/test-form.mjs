/**
 * Drives the Register form through its validation states and captures a
 * screenshot at each key moment. Uses puppeteer-core with system Chrome.
 *
 * Run against a live dev server on localhost:4321.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/tmp/form-tests';
await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle2', timeout: 30000 });

/* Skip the sticky-stack chaos entirely: use direct scroll to bring register into view. */
await page.evaluate(() => {
  const reg = document.getElementById('register');
  reg?.scrollIntoView({ behavior: 'instant', block: 'start' });
});
await new Promise((r) => setTimeout(r, 500));

const results = [];
const record = (name, note, extra = {}) =>
  results.push({ name, note, ...extra });

const shot = async (file) => {
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: false });
};

/* ─── TEST 1 — click submit with everything empty */
console.log('\n[Test 1] Submit an empty form');
await page.click('[data-submit]');
await new Promise((r) => setTimeout(r, 250));

const errorsAfterEmpty = await page.$$eval('.field-group.has-error', (els) =>
  els.map((el) => ({
    field: el.dataset.field,
    message: el.querySelector('.field-error')?.textContent?.trim() || '',
  }))
);
record('empty-submit', `${errorsAfterEmpty.length} fields show errors`, { errors: errorsAfterEmpty });
console.log(`  errors surfaced on: ${errorsAfterEmpty.map((e) => e.field).join(', ')}`);
await shot('01-empty-submit.png');

/* ─── TEST 2 — invalid email format */
console.log('\n[Test 2] Invalid email format');
await page.type('#firstName', 'John');
await page.type('#lastName', 'Doe');
await page.type('#email', 'not-a-valid-email');
await page.click('#phone'); // blur email
await new Promise((r) => setTimeout(r, 200));

const emailErr = await page.$eval(
  '.field-group[data-field="email"] .field-error',
  (el) => el.textContent?.trim() || ''
);
const emailHasError = await page.$eval(
  '.field-group[data-field="email"]',
  (el) => el.classList.contains('has-error')
);
record('invalid-email', emailErr, { hasError: emailHasError });
console.log(`  email error: "${emailErr}" | has-error class: ${emailHasError}`);
await shot('02-invalid-email.png');

/* ─── TEST 3 — invalid phone format */
console.log('\n[Test 3] Invalid phone format');
await page.type('#phone', 'abc');
await page.click('#email'); // blur phone
await new Promise((r) => setTimeout(r, 200));

const phoneErr = await page.$eval(
  '.field-group[data-field="phone"] .field-error',
  (el) => el.textContent?.trim() || ''
);
record('invalid-phone', phoneErr);
console.log(`  phone error: "${phoneErr}"`);
await shot('03-invalid-phone.png');

/* ─── TEST 4 — fix errors, add valid values, verify errors clear */
console.log('\n[Test 4] Live error clearing on input');
await page.$eval('#email', (el) => (el.value = ''));
await page.type('#email', 'john@example.com');
await page.$eval('#phone', (el) => (el.value = ''));
await page.type('#phone', '+971 50 123 4567');
await page.click('body'); // blur
await new Promise((r) => setTimeout(r, 200));

const emailClearedAfterFix = await page.$eval(
  '.field-group[data-field="email"]',
  (el) => !el.classList.contains('has-error')
);
const phoneClearedAfterFix = await page.$eval(
  '.field-group[data-field="phone"]',
  (el) => !el.classList.contains('has-error')
);
record('live-clear', `email cleared: ${emailClearedAfterFix}, phone cleared: ${phoneClearedAfterFix}`);
console.log(`  email cleared: ${emailClearedAfterFix} | phone cleared: ${phoneClearedAfterFix}`);
await shot('04-errors-cleared.png');

/* ─── TEST 5 — submit without consent */
console.log('\n[Test 5] Submit without consent checked');
await page.type('#city', 'Dubai');
await page.select('#unitType', '2 Bedroom');
await page.click('[data-submit]');
await new Promise((r) => setTimeout(r, 250));

const consentErr = await page.$eval(
  '.field-group[data-field="consent"] .field-error',
  (el) => el.textContent?.trim() || ''
);
const stillOnForm = await page.$eval('#form-view', (el) => !el.classList.contains('hidden'));
record('missing-consent', consentErr, { stillOnForm });
console.log(`  consent error: "${consentErr}" | still on form: ${stillOnForm}`);
await shot('05-missing-consent.png');

/* ─── TEST 6 — check consent + submit → thank-you card */
console.log('\n[Test 6] Complete valid submission');
await page.click('input[name="consent"]');
await new Promise((r) => setTimeout(r, 100));
await page.click('[data-submit]');
await new Promise((r) => setTimeout(r, 800)); /* dev fallback delays 400ms */

const thankyouShown = await page.$eval('#thankyou-view', (el) => !el.classList.contains('hidden'));
const formHidden   = await page.$eval('#form-view',     (el) => el.classList.contains('hidden'));
const nameText     = await page.$eval('[data-thankyou-name]',  (el) => el.textContent?.trim() || '');
const emailText    = await page.$eval('[data-thankyou-email]', (el) => el.textContent?.trim() || '');
const unitText     = await page.$eval('[data-thankyou-unit]',  (el) => el.textContent?.trim() || '');
const cityText     = await page.$eval('[data-thankyou-city]',  (el) => el.textContent?.trim() || '');
record('valid-submit', `thankyou shown: ${thankyouShown}, form hidden: ${formHidden}`, {
  personalization: { name: nameText, email: emailText, unit: unitText, city: cityText },
});
console.log(`  thank-you shown: ${thankyouShown} | form hidden: ${formHidden}`);
console.log(`  personalized: name="${nameText}" email="${emailText}" unit="${unitText}" city="${cityText}"`);
await shot('06-thankyou.png');

/* ─── TEST 7 — Register another resets the form */
console.log('\n[Test 7] "Register another" resets and returns to form');
await page.click('[data-reset]');
await new Promise((r) => setTimeout(r, 400));

const backOnForm  = await page.$eval('#form-view',     (el) => !el.classList.contains('hidden'));
const cleared     = await page.$eval('#firstName',     (el) => el.value === '');
const noErrors    = await page.$$eval('.field-group.has-error', (els) => els.length === 0);
record('reset', `back on form: ${backOnForm}, fields cleared: ${cleared}, no error state: ${noErrors}`);
console.log(`  back on form: ${backOnForm} | fields cleared: ${cleared} | no errors: ${noErrors}`);
await shot('07-reset.png');

console.log('\n─── Test summary ───');
for (const r of results) console.log(`  ${r.name}: ${r.note}`);

await fs.writeFile(`${OUT}/report.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log(`\nScreenshots: ${OUT}`);
