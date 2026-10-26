// Drive the real UI and confirm inputs cascade into derived values.
// Usage: node scripts/checks.ts [--url http://localhost:5173]
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium, type Page } from 'playwright';

const { values: args } = parseArgs({ options: { url: { type: 'string', default: 'http://localhost:5173' } } });
const fixture = JSON.parse(readFileSync('scripts/fixtures/valeros.json', 'utf8'));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((c) => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  localStorage.clear();
  localStorage.setItem(`pf1e:char:${c.id}`, JSON.stringify(c));
  localStorage.setItem('pf1e:roster', JSON.stringify([{ id: c.id, name: c.info.name, updatedAt: 0 }]));
  localStorage.setItem('pf1e:active', c.id);
}, fixture);

let failed = 0;
async function expectStat(label: string, want: string, p: Page = page) {
  const loc = p
    .locator('.stat')
    .filter({ has: p.locator('.field-label', { hasText: new RegExp(`^${label}`) }) })
    .first()
    .locator('.stat-value');
  const got = (await loc.innerText()).trim();
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${got}${ok ? '' : ` (want ${want})`}`);
}
async function expectText(desc: string, loc: ReturnType<Page['locator']>, want: RegExp) {
  const got = (await loc.innerText()).trim();
  const ok = want.test(got);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${desc}: ${got}${ok ? '' : ` (want ${want})`}`);
}
const skillTotal = (name: string) =>
  page.locator('[data-section=skills] table').last().locator('tr', { hasText: name }).locator('td').nth(4);

await page.goto(`${args.url}/#combat`);
console.log('— baseline');
await expectStat('AC', '20');
await expectStat('Melee', '+3');
await expectStat('Max HP', '54');

console.log('— size: small');
await page.locator('[data-section=info] select').first().selectOption('small');
await expectStat('AC', '21');
await expectStat('CMB', '+6');
await expectText('Stealth', skillTotal('Stealth'), /^\+2$/);

console.log('— toggle Heroism');
await page.getByLabel('Activate Heroism').check({ force: true });
await expectStat('Melee', '+6');
await expectStat('Will', '+1');

console.log('— Con 14 → 16');
await page.locator('[data-section=abilities]').getByRole('button', { name: 'Edit' }).click();
const con = page.getByLabel('con base');
await con.fill('16');
await con.blur();
await expectStat('Max HP', '59');

console.log('— remove Shaken');
await page.getByLabel('Remove Shaken').click();
await expectStat('Melee', '+8');

console.log('— gear weight → load');
await page.goto(`${args.url}/#character`);
await page.getByRole('button', { name: '+ Item' }).click();
const wt = page.getByLabel('Weight each').last();
await wt.fill('50');
await wt.blur();
await expectText('Load', page.locator('[data-section=equipment] dd').last(), /124\.06 lb \(medium\)/i);

console.log('— persistence after reload');
await page.waitForTimeout(500);
await page.reload();
await page.goto(`${args.url}/#combat`);
await expectStat('AC', '21');
await expectStat('Max HP', '59');

console.log('— export and re-import');
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON' }).click()]);
const path = await download.path();
const chooser = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Import JSON' }).click();
await (await chooser).setFiles(path!);
await page.waitForTimeout(300);
const options = await page.locator('#app > header select').first().locator('option').allInnerTexts();
const twoValeros = options.filter((o) => o === 'Valeros').length === 2;
if (!twoValeros) failed++;
console.log(`${twoValeros ? 'ok  ' : 'FAIL'} roster after import: ${options.join(', ')}`);
await expectStat('AC', '21');

if (errors.length) {
  failed += errors.length;
  console.log('page errors:', errors);
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
await browser.close();
process.exit(failed ? 1 : 0);
