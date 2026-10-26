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
const hpMax = () => page.locator('[data-section=hp] span.text-5xl');
const skillTotal = (name: string) =>
  page.locator('[data-section=skills] table').last().locator('tr', { hasText: name }).locator('td').nth(4);

await page.goto(`${args.url}/#combat`);
console.log('— baseline');
await expectStat('AC', '20');
await expectStat('Melee', '+3');
await expectText('Max HP', hpMax(), /^54$/);

console.log('— size: small');
await page.getByLabel('Size', { exact: true }).selectOption('small');
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
await expectText('Max HP', hpMax(), /^59$/);

console.log('— remove Shaken');
await page.getByLabel('Remove Shaken').click();
await expectStat('Melee', '+8');

console.log('— gear weight → load');
await page.goto(`${args.url}/#character`);
await page.getByRole('button', { name: '+ Item' }).click();
const wt = page.getByLabel('Weight each').last();
await wt.fill('50');
await wt.blur();
const totals = page.locator('[data-section=equipment] table[aria-label="Carried weight and value"] tr').last();
await expectText('Load', totals.locator('td').nth(1), /124\.06 lb \(medium\)/i);
const gpEach = page.getByLabel('Value each in gp').last();
await gpEach.fill('100');
await gpEach.blur();
await expectText('Wealth', totals.locator('td').nth(2), /^765\.2 gp$/);

console.log('— persistence after reload');
await page.waitForTimeout(500);
await page.reload();
await page.goto(`${args.url}/#combat`);
await expectStat('AC', '21');
await expectText('Max HP', hpMax(), /^59$/);

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

console.log('— database pickers');
await page.getByRole('button', { name: '⌕ Find weapon' }).click();
await page.getByLabel('Find weapon').fill('greatsword');
await page.getByRole('option', { name: /^Greatsword/ }).first().click();
const gs = page.locator('[data-section=offense] .group').last();
// Str +3 × 1.5 = +4, Power Attack +4 at BAB 4.
const dice = await gs.getByLabel('Damage dice').inputValue();
await expectText(`Greatsword damage (${dice})`, gs.locator('.field').nth(2), /^\+8/);
if (dice !== '2d6') (failed++, console.log(`FAIL greatsword dice: ${dice}`));
await page.goto(`${args.url}/#character`);
await page.getByRole('button', { name: '⌕ Find feat' }).click();
await page.getByLabel('Find feat').fill('cleave');
await page.locator('[role=listbox] [role=option]').first().waitFor();
await page.keyboard.press('Enter');
const feats = await page.locator('[data-section=feats] input[aria-label="Feat name"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
const hasCleave = feats.filter((f) => f === 'Cleave').length === 2;
if (!hasCleave) failed++;
console.log(`${hasCleave ? 'ok  ' : 'FAIL'} feat picked: ${feats.at(-1)}`);
await page.goto(`${args.url}/#combat`);
await page.getByRole('button', { name: '⌕ Find armor or shield' }).click();
await page.getByLabel('Find armor or shield').fill('breastplate');
await page.locator('[role=listbox] [role=option]').first().waitFor();
await page.keyboard.press('Enter');
const armorCount = await page.locator('[data-section=defense] tbody tr').filter({ has: page.locator('input[aria-label="Name"]') }).count();
if (armorCount !== 3) failed++;
console.log(`${armorCount === 3 ? 'ok  ' : 'FAIL'} armor rows after pick: ${armorCount}`);

console.log('— extra speed');
await page.getByRole('button', { name: '+ Speed' }).click();
await page.getByLabel('fly speed', { exact: true }).fill('60');
await page.getByLabel('fly speed', { exact: true }).blur();
await page.locator('[data-section=classes]').getByRole('button', { name: 'Done' }).click();
await expectStat('fly', '60ft');

console.log('— mythic');
await page.getByRole('button', { name: 'Config' }).click();
await page.getByLabel('Mythic tab').check();
await page.locator('aside').getByRole('button', { name: 'Close' }).click();
await page.getByRole('button', { name: 'Mythic' }).click();
await page.locator('[data-section=mythicOverview] select').first().selectOption('3');
await page.locator('[data-section=mythicOverview] select').nth(1).selectOption('champion');
await page.getByRole('button', { name: 'Combat' }).click();
await expectText('Max HP (+15 mythic)', hpMax(), /^74$/);
await expectStat('Initiative', '+5');

console.log('— collapse');
const macros = page.locator('[data-section=macros]');
await macros.locator('.section-head button').first().click();
const box = await macros.boundingBox();
const collapsedOk = !!box && box.height < 40 && (await macros.locator('.section-body').isHidden());
if (!collapsedOk) failed++;
console.log(`${collapsedOk ? 'ok  ' : 'FAIL'} collapsed macros height: ${box?.height}`);

if (errors.length) {
  failed += errors.length;
  console.log('page errors:', errors);
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
await browser.close();
process.exit(failed ? 1 : 0);
