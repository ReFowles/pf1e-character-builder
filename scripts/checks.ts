// Drive the real UI and confirm inputs cascade into derived values.
// Usage: node scripts/checks.ts [--url http://localhost:5173]
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium, type Locator, type Page } from 'playwright';

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
/** Toggle a section's Edit mode (structural controls only show while editing). */
const toggleEdit = (section: string) => page.locator(`[data-section=${section}] .section-head`).getByRole('button', { name: /^(Edit|Done editing) / }).click();
/** Choose an option from a custom Select (combobox button + popover listbox). */
const pick = async (combo: Locator, option: string) => {
  await combo.click();
  await page.locator('.select-list:popover-open').getByRole('option', { name: option, exact: true }).click();
};
const skillTotal = (name: string) =>
  page.locator('[data-section=skills] table').last().locator('tr', { hasText: name }).locator('td').nth(4);

await page.goto(`${args.url}/#combat`);
console.log('— baseline');
await expectStat('AC', '20');
await expectStat('Melee', '+3');
await expectText('Max HP', hpMax(), /^54$/);

console.log('— size: small');
await pick(page.getByLabel('Size', { exact: true }), 'Small');
await expectStat('AC', '21');
await expectStat('CMB', '+6');
await expectText('Stealth', skillTotal('Stealth'), /^\+2$/);

console.log('— toggle Heroism');
await page.getByLabel('Activate Heroism').check({ force: true });
await expectStat('Melee', '+6');
await expectStat('Will', '+1');

console.log('— Con 14 → 16');
await toggleEdit('abilities');
const con = page.getByLabel('con base');
await con.fill('16');
await con.blur();
await expectText('Max HP', hpMax(), /^59$/);

console.log('— remove Shaken');
await toggleEdit('hp');
await page.getByLabel('Remove Shaken').click();
await toggleEdit('hp');
await expectStat('Melee', '+8');

console.log('— gear weight → load');
await page.goto(`${args.url}/#character`);
await toggleEdit('equipment');
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
const options = await page.locator('#app > header .select-list').first().locator('[role=option]').allTextContents().then((t) => t.map((x) => x.trim()));
const twoValeros = options.filter((o) => o === 'Valeros').length === 2;
if (!twoValeros) failed++;
console.log(`${twoValeros ? 'ok  ' : 'FAIL'} roster after import: ${options.join(', ')}`);
await expectStat('AC', '21');

console.log('— database pickers');
await toggleEdit('offense');
await page.getByRole('button', { name: '⌕ Find weapon' }).click();
await page.getByLabel('Find weapon').fill('greatsword');
await page.getByRole('option', { name: /^Greatsword/ }).first().click();
const gs = page.locator('[data-section=offense] .group').last();
// Str +3 × 1.5 = +4, Power Attack +4 at BAB 4.
const dice = await gs.getByLabel('Damage dice').inputValue();
await expectText(`Greatsword damage (${dice})`, gs.locator('.field').nth(2), /^\+8/);
if (dice !== '2d6') (failed++, console.log(`FAIL greatsword dice: ${dice}`));
await page.goto(`${args.url}/#character`);
await toggleEdit('feats');
await page.getByRole('button', { name: '⌕ Find feat' }).click();
await page.getByLabel('Find feat').fill('cleave');
await page.locator('[role=listbox]:not(.select-list) [role=option]').first().waitFor();
await page.keyboard.press('Enter');
const feats = await page.locator('[data-section=feats] input[aria-label="Feat name"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
const hasCleave = feats.filter((f) => f === 'Cleave').length === 2;
if (!hasCleave) failed++;
console.log(`${hasCleave ? 'ok  ' : 'FAIL'} feat picked: ${feats.at(-1)}`);
await page.goto(`${args.url}/#combat`);
await toggleEdit('defense');
await page.getByRole('button', { name: '⌕ Find armor or shield' }).click();
await page.getByLabel('Find armor or shield').fill('breastplate');
await page.locator('[role=listbox]:not(.select-list) [role=option]').first().waitFor();
await page.keyboard.press('Enter');
const armorCount = await page.locator('[data-section=defense] tbody tr').filter({ has: page.locator('input[aria-label="Name"]') }).count();
if (armorCount !== 3) failed++;
console.log(`${armorCount === 3 ? 'ok  ' : 'FAIL'} armor rows after pick: ${armorCount}`);

console.log('— extra speed');
await toggleEdit('readiness');
await page.getByRole('button', { name: '+ Speed' }).click();
await page.getByLabel('fly speed', { exact: true }).fill('60');
await page.getByLabel('fly speed', { exact: true }).blur();
await toggleEdit('readiness');
await expectStat('fly', '60ft');

console.log('— mythic');
await page.getByRole('button', { name: 'Config' }).click();
await page.getByLabel('Mythic tab').check();
await page.locator('aside').getByRole('button', { name: 'Close' }).click();
await page.getByRole('button', { name: 'Mythic' }).click();
await pick(page.getByLabel('Tier', { exact: true }), '3');
await pick(page.getByLabel('Path', { exact: true }), 'Champion (5 hp/tier)');
await page.getByRole('button', { name: 'Core' }).click();
await expectText('Max HP (+15 mythic)', hpMax(), /^74$/);
await expectStat('Initiative', '+5');

console.log('— collapse');
const macros = page.locator('[data-section=macros]');
await macros.locator('.section-head button').first().click();
const box = await macros.boundingBox();
const collapsedOk = !!box && box.height < 40 && (await macros.locator('.section-body').isHidden());
if (!collapsedOk) failed++;
console.log(`${collapsedOk ? 'ok  ' : 'FAIL'} collapsed macros height: ${box?.height}`);

console.log('— other favored class bonus');
await page.getByRole('button', { name: /Level history/ }).click();
await pick(page.getByLabel('Favored class bonus at level 1'), 'Other…');
await page.getByLabel('Amount per level').fill('1/3');
await page.getByLabel('Alternate favored class bonus').pressSequentially('channel damage');
await page.getByLabel('Alternate favored class bonus').press('Enter');
await expectText('FCB summary', page.locator('[data-section=classes] ul'), /channel damage \+1\/3/);

console.log('— drag favorites');
const favRows = page.locator('[data-section=skills] table').first().locator('tbody tr');
const handle = (i: number) => favRows.nth(i).locator('[data-sort-handle]');
await favRows.first().scrollIntoViewIfNeeded();
const target = await favRows.first().boundingBox();
const src = await handle(2).boundingBox();
await page.mouse.move(src!.x + src!.width / 2, src!.y + src!.height / 2);
await page.mouse.down();
await page.mouse.move(target!.x + 40, target!.y + target!.height / 2, { steps: 8 });
await page.mouse.up();
await expectText('First favorite after drag', favRows.first().locator('td').nth(3), /^Perception/);

console.log('— summoner preset and other caster');
await toggleEdit('classes');
await page.getByRole('button', { name: '+ Class' }).click();
const nameInput = page.getByLabel('Class name').last();
await nameInput.fill('Summoner');
await nameInput.blur();
await toggleEdit('classes');
await page.getByRole('button', { name: 'Spells' }).click();
await toggleEdit('spellcasting');
await page.getByRole('button', { name: '+ Spellcasting class' }).click();
const tableOk = (await page.locator('[data-section=spellcasting] select').nth(3).inputValue()) === 'bard';
if (!tableOk) failed++;
console.log(`${tableOk ? 'ok  ' : 'FAIL'} summoner uses the bard spell table`);
await page.getByRole('button', { name: '+ Spellcasting class' }).click();
const other = page.locator('[data-section=spellcasting] .section-body > div').last();
await other.locator('select').first().selectOption({ label: 'Other' });
await other.getByLabel('Spell table').selectOption('');
const cl = other.locator('label', { hasText: 'Caster level' }).locator('input');
await cl.fill('5');
await cl.blur();
const misc1 = other.getByLabel('Misc slots level 1');
await misc1.fill('2');
await misc1.blur();
// Int 12 (+1) adds a bonus 1st-level spell: 0 base + 1 bonus + 2 misc.
await expectText('Other caster 1st level', other.getByText(/^DC \d+ · \d+\/day$/), /3\/day/);

if (errors.length) {
  failed += errors.length;
  console.log('page errors:', errors);
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
await browser.close();
process.exit(failed ? 1 : 0);
