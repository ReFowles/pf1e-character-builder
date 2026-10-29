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
function check(desc: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${desc}${detail ? `: ${detail}` : ''}`);
}
const hpMax = () => page.locator('[data-section=hp] [data-hp-max]');
/** Toggle a section's Edit mode (structural controls only show while editing). */
const openSettings = () => page.locator('nav').getByRole('button', { name: 'Settings', exact: true }).click();
/** Open the classes section's Level history table (a toggle, so only click when it's closed). */
const openLevelHistory = async () => {
  const btn = page.getByRole('button', { name: /^Level history/ });
  if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
};
const toggleEdit = (section: string) => page.locator(`[data-section=${section}] .section-head`).getByRole('button', { name: /^(Edit|Done editing) / }).click();
/** Choose an option from a custom Select (combobox button + popover listbox). */
const pick = async (combo: Locator, option: string) => {
  await combo.click();
  await page.locator('.select-list:popover-open').getByRole('option', { name: option, exact: true }).click();
};
const skillTotal = (name: string) =>
  page.locator('[data-section=skills] table').last().locator('tr', { hasText: name }).locator('td').nth(4);

await page.goto(`${args.url}/#core`);
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

console.log('— language combobox');
await page.locator('nav').getByRole('button', { name: 'Core', exact: true }).click();
await toggleEdit('info');
const addLang = page.getByLabel('Add language');
await addLang.fill('Elv');
await expectText('Elven suggested', page.locator('.select-list:popover-open').getByRole('option'), /^Elven$/);
await addLang.press('ArrowDown');
await addLang.press('Enter');
check('Elven chip added', (await page.getByLabel('Remove Elven').count()) === 1);
await page.getByLabel('Remove Elven').click();
await toggleEdit('info');

console.log('— conditions without edit mode');
await page.getByLabel('Remove Shaken').click();
await expectStat('Melee', '+8');
await page.getByLabel('Add condition').fill('Sickened');
await page.getByLabel('Add condition').press('Enter');
await expectStat('Melee', '+6');
await page.getByLabel('Remove Sickened').click();
await expectStat('Melee', '+8');

console.log('— edit-only columns');
const gpHead = page.locator('[data-section=defense] th', { hasText: /^gp$/ });
check('armor gp hidden outside edit', (await gpHead.count()) === 0);
await toggleEdit('defense');
check('armor gp shown in edit', (await gpHead.count()) === 1);
await toggleEdit('defense');
check('skill grips hidden outside edit', (await page.locator('[data-section=skills] [data-sort-handle]').count()) === 0);

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
await page.goto(`${args.url}/#core`);
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
await page.goto(`${args.url}/#core`);
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
await openSettings();
await page.getByLabel('Mythic tab').check();
await page.locator('nav').getByRole('button', { name: 'Mythic', exact: true }).click();
await pick(page.getByLabel('Tier', { exact: true }), '3');
await pick(page.getByLabel('Path', { exact: true }), 'Champion (5 hp/tier)');
await page.locator('nav').getByRole('button', { name: 'Core', exact: true }).click();
await expectText('Max HP (+15 mythic)', hpMax(), /^74$/);
await expectStat('Initiative', '+5');
await page.locator('nav').getByRole('button', { name: 'Mythic', exact: true }).click();
await page.getByLabel('Mythic Paragon').check();
await expectText('Mythic power with paragon', page.locator('[data-section=mythicOverview] .stat', { hasText: 'Mythic power' }).locator('.stat-value'), /^9\/9$/);
await page.locator('nav').getByRole('button', { name: 'Core', exact: true }).click();
await expectStat('Initiative', '+7');

console.log('— collapse');
const macros = page.locator('[data-section=macros]');
await macros.locator('.section-head button').first().click();
const box = await macros.boundingBox();
const collapsedOk = !!box && box.height < 40 && (await macros.locator('.section-body').isHidden());
if (!collapsedOk) failed++;
console.log(`${collapsedOk ? 'ok  ' : 'FAIL'} collapsed macros height: ${box?.height}`);

console.log('— other favored class bonus');
await toggleEdit('classes');
await page.getByRole('button', { name: /Level history/ }).click();
await pick(page.getByLabel('Favored class bonus at level 1'), 'Other…');
await page.getByLabel('Amount per level').fill('1/3');
await page.getByLabel('Alternate favored class bonus').pressSequentially('channel damage');
await page.getByLabel('Alternate favored class bonus').press('Enter');
await expectText('FCB summary', page.locator('[data-section=classes] ul'), /channel damage \+1\/3/);
await toggleEdit('classes');

console.log('— drag favorites');
await toggleEdit('skills');
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
await toggleEdit('skills');

console.log('— summoner preset and other caster');
await toggleEdit('classes');
await page.getByRole('button', { name: '+ Class' }).click();
const nameInput = page.getByLabel('Class name').last();
await nameInput.fill('Summoner');
await nameInput.blur();
await toggleEdit('classes');
const addSpellSection = async () => {
  await openSettings();
  await page.getByRole('button', { name: '+ Spellcasting section' }).click();
  await page.locator('nav').getByRole('button', { name: 'Spells', exact: true }).click();
};
await page.locator('nav').getByRole('button', { name: 'Spells', exact: true }).click();
await addSpellSection();
const summoner = page.locator('[data-section^=spells-]').first();
await expectText('Section title', summoner.locator('.section-head h2'), /^Summoner$/i);
await summoner.locator('.section-head').getByRole('button', { name: /^Edit / }).click();
await expectText('Summoner spell table', summoner.getByLabel('Spell table'), /^Bard/);
await addSpellSection();
const other = page.locator('[data-section^=spells-]').last();
await other.locator('.section-head').getByRole('button', { name: /^Edit / }).click();
await pick(other.getByLabel('Class', { exact: true }), 'Other');
await other.getByLabel('Label', { exact: true }).fill('Racial');
await pick(other.getByLabel('Spell table'), 'Manual');
await expectText('Other section title', other.locator('.section-head h2'), /^Racial$/i);
const cl = other.getByLabel('Caster level', { exact: true });
await cl.fill('5');
await cl.blur();
await expectText('Other caster level', other.locator('.stat', { hasText: 'Cnc' }).locator('.stat-value'), /^\+6$/);
const misc1 = other.getByLabel('Misc slots level 1');
await misc1.fill('2');
await misc1.blur();
// Int 12 (+1) adds a bonus 1st-level spell: 0 base + 1 bonus + 2 misc.
await expectText('Other caster 1st level', other.getByText(/^DC \d+ · \d+\/day$/), /3\/day/);

console.log('— dark mode');
await openSettings();
await page.getByLabel('Dark mode').check();
const paperBg = () => page.evaluate(() => getComputedStyle(document.querySelector('.sheet-section')!).backgroundColor);
const darkBg = await paperBg();
check('dark mode on screen', (await page.evaluate(() => document.documentElement.classList.contains('dark'))) && darkBg !== 'rgb(255, 253, 248)', darkBg);
await page.emulateMedia({ media: 'print' });
check('print stays light (white paper)', (await paperBg()) === 'rgb(255, 255, 255)', await paperBg());
await page.emulateMedia({ media: 'screen' });
await page.getByLabel('Dark mode').uncheck();

console.log('— other caster with a spell table');
await page.locator('nav').getByRole('button', { name: 'Spells', exact: true }).click();
await pick(other.getByLabel('Spell table'), 'Wizard / Witch');
await expectText('Other caster 3rd level (CL 5 wizard table)', other.getByText(/^3rd level$/i), /3rd level/i);

console.log('— enlarge person');
await page.locator('nav').getByRole('button', { name: 'Core', exact: true }).click();
await expectText('BAB single number', page.locator('.stat', { has: page.locator('.field-label', { hasText: /^BAB$/ }) }).first().locator('.stat-value'), /^\+\d+$/);
const offenseEdit = page.locator('[data-section=offense] .section-head').getByRole('button', { name: /^(Edit|Done editing) / });
if ((await offenseEdit.getAttribute('aria-pressed')) === 'true') await offenseEdit.click();
const longswordDamage = page.locator('[data-section=offense] .field', { has: page.locator('.field-label', { hasText: /^Damage$/ }) }).first();
const acBefore = await page.locator('.stat', { has: page.locator('.field-label', { hasText: /^AC$/ }) }).first().locator('.stat-value').innerText();
await macros.locator('.section-head button').first().click(); // collapsed by the collapse check
await toggleEdit('macros');
await pick(page.getByLabel('Add macro from library'), 'Enlarge Person');
await toggleEdit('macros');
await page.getByLabel('Activate Enlarge Person').check({ force: true });
await expectText('Longsword damage one size up', longswordDamage, /^2d6/);
await expectStat('AC', String(Number(acBefore) - 1));
await page.getByLabel('Activate Enlarge Person').uncheck({ force: true });
await expectText('Longsword damage back to normal', longswordDamage, /^1d8/);

console.log('— equipped checkbox');
await page.locator('nav').getByRole('button', { name: 'Character', exact: true }).click();
const eqp = page.locator('[data-section=equipment] tbody tr').first().getByRole('checkbox').first();
const wasEquipped = await eqp.isChecked();
await eqp.click();
check('Eqp toggles outside edit mode', (await eqp.isChecked()) !== wasEquipped);

console.log('— prestige class advancing spellcasting');
await page.locator('nav').getByRole('button', { name: 'Core', exact: true }).click();
await toggleEdit('classes');
await page.getByRole('button', { name: '+ Class' }).click();
const prestigeName = page.getByLabel('Class name').last();
await prestigeName.fill('Eldritch');
await page.locator('.select-list:popover-open').getByRole('option', { name: 'Eldritch Knight' }).waitFor();
await prestigeName.press('ArrowDown');
await prestigeName.press('Enter');
check('prestige badge', (await page.locator('[data-section=classes]').getByText('PrC', { exact: true }).count()) === 1);
await pick(page.getByLabel('Class for new level'), 'Eldritch Knight');
await page.getByRole('button', { name: '+ Level' }).click();
await page.getByRole('button', { name: '+ Level' }).click();
await openLevelHistory();
const advance = page.getByLabel(/^Level \d+ advances Summoner spellcasting/);
check('first EK level does not advance casting', !(await advance.first().isChecked()));
check('second EK level advances casting', await advance.last().isChecked());
await toggleEdit('classes');
await page.locator('nav').getByRole('button', { name: 'Spells', exact: true }).click();
await expectText('Summoner CL (no class levels) with one prestige advancement', summoner.locator('.stat', { hasText: 'CL' }).locator('.stat-value').first(), /^1$/);
await page.locator('nav').getByRole('button', { name: 'Core', exact: true }).click();
await toggleEdit('classes');
await openLevelHistory();
await page.getByLabel(/^Remove level \d+$/).last().click();
await page.getByLabel(/^Remove level \d+$/).last().click();
await page.getByLabel('Remove class').last().click();
await toggleEdit('classes');

console.log('— wand built from a spell');
await page.locator('nav').getByRole('button', { name: 'Character', exact: true }).click();
await toggleEdit('equipment');
await pick(page.getByLabel('What to search for'), 'Wands (by spell)');
await page.getByRole('button', { name: '⌕ Find wand spell' }).click();
await page.getByLabel('Find wand spell').fill('cure light wounds');
await page.locator('[role=listbox]:not(.select-list) [role=option]', { hasText: /^Cure Light Wounds/ }).first().click();
const wandRow = page.locator('[data-section=equipment] tbody tr', { has: page.locator('input[aria-label="Item name"]') }).last();
check('wand name', (await wandRow.locator('input[aria-label="Item name"]').inputValue()) === 'Wand of Cure Light Wounds (CL 1)', await wandRow.locator('input[aria-label="Item name"]').inputValue());
check('wand price 750', (await wandRow.locator('input[aria-label="Value each in gp"]').inputValue()) === '750');
check('wand charges 50', (await wandRow.locator('input[aria-label*="charges"]').inputValue()) === '50');
await wandRow.getByLabel(/^Remove /).click();
await toggleEdit('equipment');

console.log('— dice');
await page.locator('nav').getByRole('button', { name: 'Core', exact: true }).click();
const initText = await page.locator('.stat', { has: page.locator('.field-label', { hasText: /^Initiative$/ }) }).locator('.stat-value').innerText();
await page.getByRole('button', { name: 'Roll Initiative' }).click();
await page.getByRole('button', { name: /^Roll log/ }).click();
const entry = page.locator('[data-roll]').last();
await entry.waitFor();
const total = Number(await entry.getAttribute('data-total'));
const die = Number(await entry.getAttribute('data-dice'));
check(`initiative roll = d20 + ${initText}`, die >= 1 && die <= 20 && total === die + Number(initText), `${die} → ${total}`);
await page.getByRole('button', { name: 'd6', exact: true }).click();
const tray = page.locator('[data-roll]').last();
const d6 = Number(await tray.getAttribute('data-dice'));
check('tray d6 in range', d6 >= 1 && d6 <= 6, String(d6));
await expectStat('Initiative', initText); // rollables add no text
await page.getByRole('button', { name: 'Close', exact: true }).click();

console.log('— campaign notes');
await page.locator('nav').getByRole('button', { name: 'Notes', exact: true }).click();
const prose = page.locator('[data-section=notes] .ProseMirror');
await prose.click();
await page.keyboard.type('# Session 1');
await page.keyboard.press('Enter');
await page.keyboard.type('Met the **baron**.');
await expectText('Heading from markdown shortcut', page.locator('[data-section=notes] .ProseMirror h1'), /^Session 1$/);
await page.waitForTimeout(600); // autosave debounce
await page.reload();
await page.locator('nav').getByRole('button', { name: 'Notes', exact: true }).click();
await expectText('Notes persist after reload', page.locator('[data-section=notes] .ProseMirror strong'), /^baron$/);
await page.emulateMedia({ media: 'print' });
check('notes hidden in print by default', await page.locator('[data-section=notes]').isHidden());
await page.emulateMedia({ media: 'screen' });

console.log('— companions');
await openSettings();
await page.getByLabel(/Companions tab/).check();
await page.getByRole('button', { name: '+ Companion' }).click();
await page.locator('nav').getByRole('button', { name: 'Companions', exact: true }).click();
const comp = page.locator('[data-section^=companion-]').first();
await expectText('Companion title', comp.locator('.section-head h2'), /animal companion/i);
// Linked to Fighter 4: animal companion level 4 = 4 HD, BAB +3.
await expectText('Companion summary', comp.locator('p.text-sm').first(), /4 HD · level 4/);
await expectText('Companion BAB', comp.locator('.stat', { has: page.locator('.field-label', { hasText: /^BAB$/ }) }).locator('.stat-value'), /^\+3$/);

console.log('— small-screen menu');
await page.setViewportSize({ width: 390, height: 800 });
check('header buttons hidden on small screens', !(await page.locator('#app > header').getByRole('button', { name: 'Export JSON' }).first().isVisible()));
await page.getByRole('button', { name: 'Menu' }).click();
check('menu holds Export JSON', await page.getByRole('menuitem', { name: 'Export JSON' }).isVisible());
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 1280, height: 900 });

if (errors.length) {
  failed += errors.length;
  console.log('page errors:', errors);
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
await browser.close();
process.exit(failed ? 1 : 0);
