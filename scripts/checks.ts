// Drive the real UI and confirm inputs cascade into derived values.
// Usage: node scripts/checks.ts [--url http://localhost:5173]
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium, type Locator, type Page } from 'playwright';
import { seedCharacter } from './seed.ts';

const { values: args } = parseArgs({ options: { url: { type: 'string', default: 'http://localhost:5173' } } });
const fixture = JSON.parse(readFileSync('scripts/fixtures/valeros.json', 'utf8'));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
await seedCharacter(page, fixture);

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
/** Switch to a sheet tab by its label (the gear tab is "Settings"). */
const goTab = (name: string) => page.locator('nav').getByRole('button', { name, exact: true }).click();
const openSettings = () => goTab('Settings');
/** Open the classes section's Level history table (a toggle, so only click when it's closed). */
const openLevelHistory = async () => {
  const btn = page.getByRole('button', { name: /^Level history/ });
  if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
};
/** Toggle a section's Edit mode (structural controls only show while editing). */
const toggleEdit = (section: string) => page.locator(`[data-section=${section}] .section-head`).getByRole('button', { name: /^(Edit|Done editing) / }).click();
/** Choose an option from a custom Select (combobox button + popover listbox). */
const pick = async (combo: Locator, option: string) => {
  await combo.click();
  await page.locator('.select-list:popover-open').getByRole('option', { name: option, exact: true }).click();
};
/** Picking a class opens its progression table; + Level opens the level-up checklist. */
const closeProgression = () => page.getByRole('dialog', { name: /progression$/ }).getByRole('button', { name: 'Close' }).click();
const closeChecklist = () => page.getByRole('dialog', { name: /checklist$/ }).getByRole('button', { name: 'Done', exact: true }).click();
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
await goTab('Core');
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
await goTab('Settings');
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON' }).click()]);
const path = await download.path();
const chooser = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Import JSON' }).click();
await (await chooser).setFiles(path!);
await goTab('Core');
await page.waitForTimeout(300);
const options = await page.locator('#app > header .select-list').first().locator('[role=option]').allTextContents().then((t) => t.map((x) => x.trim()));
check('roster after import', options.filter((o) => o === 'Valeros').length === 2, options.join(', '));
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
check('greatsword dice', dice === '2d6', dice);
await page.goto(`${args.url}/#character`);
await toggleEdit('feats');
await page.getByRole('button', { name: '⌕ Find feat' }).click();
await page.getByLabel('Find feat').fill('cleave');
await page.locator('[role=listbox]:not(.select-list) [role=option]').first().waitFor();
await page.keyboard.press('Enter');
const feats = await page.locator('[data-section=feats] input[aria-label="Feat name"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
check('feat picked', feats.filter((f) => f === 'Cleave').length === 2, feats.at(-1));
await page.goto(`${args.url}/#core`);
await toggleEdit('defense');
await page.getByRole('button', { name: '⌕ Find armor or shield' }).click();
await page.getByLabel('Find armor or shield').fill('breastplate');
await page.locator('[role=listbox]:not(.select-list) [role=option]').first().waitFor();
await page.keyboard.press('Enter');
const armorCount = await page.locator('[data-section=defense] tbody tr').filter({ has: page.locator('input[aria-label="Name"]') }).count();
check('armor rows after pick', armorCount === 3, String(armorCount));

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
await goTab('Mythic');
await pick(page.getByLabel('Tier', { exact: true }), '3');
await pick(page.getByLabel('Path', { exact: true }), 'Champion (5 hp/tier)');
await goTab('Core');
await expectText('Max HP (+15 mythic)', hpMax(), /^74$/);
await expectStat('Initiative', '+5');
await goTab('Mythic');
await page.getByLabel('Mythic Paragon').check();
await expectText('Mythic power with paragon', page.locator('[data-section=mythicOverview] .stat', { hasText: 'Mythic power' }).locator('.stat-value'), /^9\/9$/);
await goTab('Core');
await expectStat('Initiative', '+7');

console.log('— collapse');
const macros = page.locator('[data-section=macros]');
await macros.locator('.section-head button').first().click();
const box = await macros.boundingBox();
check('collapsed macros height', !!box && box.height < 40 && (await macros.locator('.section-body').isHidden()), String(box?.height));

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
await closeProgression();
await toggleEdit('classes');
const addSpellSection = async () => {
  await openSettings();
  await page.getByRole('button', { name: '+ Spellcasting section' }).click();
  await goTab('Spells');
};
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
await goTab('Spells');
await pick(other.getByLabel('Spell table'), 'Wizard / Witch');
await expectText('Other caster 3rd level (CL 5 wizard table)', other.getByText(/^3rd level$/i), /3rd level/i);

console.log('— enlarge person');
await goTab('Core');
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
await goTab('Character');
const eqp = page.locator('[data-section=equipment] tbody tr').first().getByRole('checkbox').first();
const wasEquipped = await eqp.isChecked();
await eqp.click();
check('Eqp toggles outside edit mode', (await eqp.isChecked()) !== wasEquipped);

console.log('— prestige class advancing spellcasting');
await goTab('Core');
await toggleEdit('classes');
await page.getByRole('button', { name: '+ Class' }).click();
const prestigeName = page.getByLabel('Class name').last();
await prestigeName.fill('Eldritch');
await page.locator('.select-list:popover-open').getByRole('option', { name: 'Eldritch Knight' }).waitFor();
await prestigeName.press('ArrowDown');
await prestigeName.press('Enter');
await closeProgression();
check('prestige badge', (await page.locator('[data-section=classes]').getByText('PrC', { exact: true }).count()) === 1);
await pick(page.getByLabel('Class for new level'), 'Eldritch Knight');
await page.getByRole('button', { name: '+ Level' }).click();
await closeChecklist();
await page.getByRole('button', { name: '+ Level' }).click();
await closeChecklist();
await openLevelHistory();
const advance = page.getByLabel(/^Level \d+ advances Summoner spellcasting/);
check('first EK level does not advance casting', !(await advance.first().isChecked()));
check('second EK level advances casting', await advance.last().isChecked());
await toggleEdit('classes');
await goTab('Spells');
await expectText('Summoner CL (no class levels) with one prestige advancement', summoner.locator('.stat', { hasText: 'CL' }).locator('.stat-value').first(), /^1$/);
await goTab('Core');
await toggleEdit('classes');
await openLevelHistory();
await page.getByLabel(/^Remove level \d+$/).last().click();
await page.getByLabel(/^Remove level \d+$/).last().click();
await page.getByLabel('Remove class').last().click();
await toggleEdit('classes');

console.log('— wand built from a spell');
await goTab('Character');
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
await goTab('Core');
const initText = await page.locator('.stat', { has: page.locator('.field-label', { hasText: /^Initiative$/ }) }).locator('.stat-value').innerText();
await page.getByRole('button', { name: 'Roll Initiative' }).click();
await page.getByRole('button', { name: /^Roll log/ }).click();
const entry = page.locator('[data-roll]').last();
await entry.waitFor();
const total = Number(await entry.getAttribute('data-total'));
const die = Number(await entry.getAttribute('data-dice'));
check(`initiative roll = d20 + ${initText}`, die >= 1 && die <= 20 && total === die + Number(initText), `${die} → ${total}`);
await page.getByRole('button', { name: 'Add a d6' }).click();
await page.getByRole('button', { name: 'Add a d6' }).click();
await page.getByRole('button', { name: 'Add a d20' }).click();
await page.getByRole('button', { name: 'Roll', exact: true }).click();
const tray = page.locator('[data-roll]').last();
const trayNotation = await tray.locator('.font-mono').first().innerText();
const trayDice = (await tray.getAttribute('data-dice'))?.split(',') ?? [];
check('tray rolls 2d6+1d20 as one entry', trayNotation === '2d6+1d20' && trayDice.length === 3, `${trayNotation}, ${trayDice.length} dice`);
check('tray resets after rolling', (await page.getByRole('button', { name: 'Roll', exact: true }).isDisabled()) === true);
await expectStat('Initiative', initText); // rollables add no text
await page.getByRole('button', { name: 'Close', exact: true }).click();

console.log('— spell rolls');
await goTab('Spells');
await other.getByRole('button', { name: /1st-level spell/ }).first().click();
await other.getByLabel('Spell name').first().fill('Fireball');
await other.getByRole('button', { name: /Set up Fireball attack and damage rolls/ }).click();
await other.getByLabel('Spell damage dice').fill('1d6');
await other.getByLabel('Spell damage type').fill('fire');
await other.getByLabel('Caster level cap for per-level damage (0 for none)').fill('3');
await other.getByLabel('Caster level cap for per-level damage (0 for none)').blur();
await other.getByLabel('Dice/level').check();
await pick(other.getByLabel('Spell attack'), 'Ranged touch');
await other.locator('.section-head').getByRole('button', { name: /^Done editing / }).click();
check('spell roll setup is hidden outside edit mode', (await other.getByRole('button', { name: /Set up Fireball/ }).count()) === 0 && (await other.getByLabel('Spell damage dice').count()) === 0);
await expectText('Spell damage shows dice per level up to the cap', other.getByRole('button', { name: 'Roll Fireball damage' }), /^3d6$/);
await other.getByRole('button', { name: 'Roll Fireball damage' }).click();
await page.getByRole('button', { name: /^Roll log/ }).click();
const spellRoll = page.locator('[data-roll]').last();
await spellRoll.waitFor();
const spellDice = (await spellRoll.getAttribute('data-dice'))?.split(',').map(Number) ?? [];
check('spell damage rolls 3d6', spellDice.length === 3 && Number(await spellRoll.getAttribute('data-total')) === spellDice.reduce((x, y) => x + y, 0), spellDice.join(','));
await page.getByRole('button', { name: 'Close', exact: true }).click();
await other.getByRole('button', { name: 'Roll Fireball attack' }).click();
await page.getByRole('button', { name: /^Roll log/ }).click();
const spellAttack = page.locator('[data-roll]').last();
const atkBonus = Number((await other.getByRole('button', { name: 'Roll Fireball attack' }).innerText()).replace('+', ''));
const atkDie = Number(await spellAttack.getAttribute('data-dice'));
check(`spell attack = d20 ${atkBonus >= 0 ? '+' : ''}${atkBonus}`, Number(await spellAttack.getAttribute('data-total')) === atkDie + atkBonus, `${atkDie} → ${await spellAttack.getAttribute('data-total')}`);
await page.getByRole('button', { name: 'Close', exact: true }).click();

console.log('— campaign notes');
await goTab('Notes');
const prose = page.locator('[data-section=notes] .ProseMirror');
await prose.click();
await page.keyboard.type('# Session 1');
await page.keyboard.press('Enter');
await page.keyboard.type('Met the **baron**.');
await expectText('Heading from markdown shortcut', page.locator('[data-section=notes] .ProseMirror h1'), /^Session 1$/);
await page.waitForTimeout(600); // autosave debounce
await page.reload();
await goTab('Notes');
await expectText('Notes persist after reload', page.locator('[data-section=notes] .ProseMirror strong'), /^baron$/);
await page.emulateMedia({ media: 'print' });
check('notes hidden in print by default', await page.locator('[data-section=notes]').isHidden());
await page.emulateMedia({ media: 'screen' });

console.log('— companions');
await openSettings();
await page.getByLabel(/Companions tab/).check();
await page.getByRole('button', { name: '+ Companion' }).click();
await goTab('Companions');
const comp = page.locator('[data-section^=companion-]').first();
await expectText('Companion title', comp.locator('.section-head h2'), /animal companion/i);
// Linked to Fighter 4: animal companion level 4 = 4 HD, BAB +3.
await expectText('Companion summary', comp.locator('p.text-sm').first(), /4 HD · level 4/);
await expectText('Companion BAB', comp.locator('.stat', { has: page.locator('.field-label', { hasText: /^BAB$/ }) }).locator('.stat-value'), /^\+3$/);

console.log('— first-run walkthrough');
await goTab('Core');
await page.evaluate(() => localStorage.removeItem('pf1e:prefs'));
await page.reload();
const tourDialog = page.getByRole('dialog', { name: 'Edit mode' });
await tourDialog.waitFor();
await tourDialog.getByRole('button', { name: 'Next' }).click();
await page.getByRole('dialog', { name: 'Info' }).getByRole('button', { name: 'Next' }).click();
await page.getByRole('dialog', { name: 'Dice log' }).getByRole('button', { name: 'Next' }).click();
await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Done' }).click();
check('walkthrough dismissed and remembered', (await page.getByRole('dialog').count()) === 0 && (await page.evaluate(() => JSON.parse(localStorage.getItem('pf1e:prefs') ?? '{}').tourSeen)) === true);

console.log('— small-screen header');
await page.setViewportSize({ width: 390, height: 800 });
check('import and export are not in the header', (await page.locator('#app > header').getByRole('button', { name: /JSON/ }).count()) === 0);
check('no hamburger menu', (await page.getByRole('button', { name: 'Menu', exact: true }).count()) === 0);
check('print stays in the header', await page.locator('#app > header').getByRole('button', { name: 'Print / PDF' }).isVisible());

console.log('— small-screen section order');
const top = async (id: string) => (await page.locator(`[data-section="${id}"]`).boundingBox())!.y;
await goTab('Core');
check('currency comes last on small screens', (await top('currency')) > (await top('special')));
await openSettings();
await page.getByRole('button', { name: 'Move Special Abilities (small-screen order)' }).press('ArrowUp');
await goTab('Core');
check('reordered section moves up', (await top('special')) < (await top('defense')));
await openSettings();
await page.getByRole('button', { name: 'Reset layout' }).click();
await goTab('Core');
check('reset restores the default order', (await top('special')) > (await top('defense')));
await page.setViewportSize({ width: 1280, height: 900 });

console.log('— gestalt');
const will = async () => Number((await page.locator('.stat').filter({ has: page.locator('.field-label', { hasText: /^Will/ }) }).first().locator('.stat-value').innerText()).trim());
const willBefore = await will();
await openSettings();
await page.getByLabel(/Gestalt \(each level/).check();
await goTab('Core');
await toggleEdit('classes');
await page.getByRole('button', { name: '+ Class' }).click();
const wizName = page.getByLabel('Class name').last();
await wizName.fill('Wizard');
await wizName.blur();
await closeProgression();
await openLevelHistory();
const gestaltPicks = page.getByLabel(/^Gestalt class for level \d+$/);
const levelCount = await gestaltPicks.count();
for (let i = 0; i < levelCount; i++) await pick(gestaltPicks.nth(i), 'Wizard');
await toggleEdit('classes');
const willGestalt = await will();
check('gestalt Wizard side raises Will (good save track)', willGestalt > willBefore, `${willBefore} → ${willGestalt}`);
await openSettings();
await page.getByLabel(/Gestalt \(each level/).uncheck();
await goTab('Core');
check('turning gestalt off restores Will', (await will()) === willBefore, String(await will()));

console.log('— progression table');
await goTab('Core');
await page.getByRole('button', { name: 'Fighter progression table' }).click();
const prog = page.getByRole('dialog', { name: 'Fighter progression' });
await prog.locator('tbody tr').first().waitFor();
check('20 fighter levels', (await prog.locator('tbody tr').count()) === 20);
// Earlier checks add levels, so read the fighter and character levels off the sheet.
const fighterLevel = Number(await page.locator('[data-section=classes] tbody tr').first().locator('td').nth(1).innerText());
const totalLevel = Number(await page.locator('[data-section=classes] .stat-value').first().innerText());
check('reached levels highlighted', (await prog.locator('tbody tr.reached').count()) === fighterLevel, `${await prog.locator('tbody tr.reached').count()} of ${fighterLevel}`);
await expectText('next fighter level lands on the next character level', prog.locator('tbody tr').nth(fighterLevel).locator('td').last(), new RegExp(`^Lv ${totalLevel + 1}\\b`));
await expectText('fighter 7 features', prog.locator('tbody tr').nth(6).locator('td').nth(5), /Armor Training \+2/);
const archetypeBox = prog.getByLabel('Add an archetype');
await archetypeBox.fill('Two-Handed Fighter');
await page.locator('.select-list:popover-open').getByRole('option', { name: 'Two-Handed Fighter', exact: true }).click();
check('archetype chip', (await prog.getByLabel('Remove Two-Handed Fighter').count()) === 1);
const lv3 = prog.locator('tbody tr').nth(2);
check('Overhand Chop at 3', (await lv3.getByRole('button', { name: 'Overhand Chop' }).count()) === 1);
check('armor training 1 struck through', (await lv3.getByRole('button', { name: 'Armor Training +1' }).getAttribute('class'))?.includes('line-through') === true);
await lv3.getByRole('button', { name: 'Overhand Chop' }).click();
check('feature description shown', /two-handed/i.test(await prog.locator('footer').innerText()));
await closeProgression();
await expectText('archetype under class name', page.locator('[data-section=classes] [title=Archetypes]').first(), /^Two-Handed Fighter$/);

console.log('— level-up checklist');
await toggleEdit('classes');
await pick(page.getByLabel('Class for new level'), 'Fighter');
await page.getByRole('button', { name: '+ Level' }).click();
const list = page.getByRole('dialog', { name: /checklist$/ });
await list.getByText('class features').waitFor();
const lvl = Number((await list.locator('h2').innerText()).match(/\d+/)![0]);
await list.getByRole('button', { name: /^Average/ }).click();
check('average HP filled in', Number(await list.getByLabel(/^HP rolled at level/).inputValue()) > 0);
check('ability increase offered at a 4th level', (lvl % 4 === 0) === ((await list.getByText('Ability score increase').count()) === 1), `level ${lvl}`);
check('feat item at odd levels', (lvl % 2 === 1) === ((await list.getByText(/feat for reaching level/).count()) === 1), `level ${lvl}`);
const featureBoxes = list.locator('label:has(input[type=checkbox])').filter({ hasText: /new|improves/ });
if (await featureBoxes.count()) {
  const abilityRows = page.locator('[data-section=classAbilities] input[aria-label="Ability name"]');
  await goTab('Character');
  const before = await abilityRows.count();
  await featureBoxes.first().locator('input').check();
  check('ticking a feature adds a class ability', (await abilityRows.count()) === before + 1, `${before} → ${await abilityRows.count()}`);
} else check('checklist lists fighter features', false, 'none listed');
check('checklist stays open across tabs', await list.isVisible());
await closeChecklist();
await goTab('Core');
await toggleEdit('classes');

// A fresh copy of the fixture, so these don't depend on the edits above.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await seedCharacter(p, fixture);
  await p.goto(`${args.url}/#core`);
  const edit = (section: string) => p.locator(`[data-section=${section}] .section-head`).getByRole('button', { name: /^(Edit|Done editing) / }).click();
  const choose = async (combo: Locator, option: string) => {
    await combo.click();
    await p.locator('.select-list:popover-open').getByRole('option', { name: option, exact: true }).click();
  };
  const total = (name: string) => p.locator('[data-section=skills] table').last().locator('tr', { hasText: name }).locator('td').nth(4);
  const num = async (loc: Locator) => Number((await loc.innerText()).match(/[+-]?\d+/)![0]);
  const addMacro = async (name: string) => {
    await choose(p.getByLabel('Add macro from library'), name);
    await p.getByLabel(`Activate ${name}`, { exact: true }).check({ force: true });
  };

  console.log('— macro library: Tears to Wine, Inspiration, Blur');
  const perception = await num(total('Perception'));
  const climb = await num(total('Climb'));
  await edit('macros');
  await addMacro('Tears to Wine');
  check('Tears to Wine raises Wis skills', (await num(total('Perception'))) === perception + 2, `${perception} → ${await num(total('Perception'))}`);
  check('Tears to Wine leaves Str skills', (await num(total('Climb'))) === climb);
  await addMacro('Inspiration');
  await expectText('skill shows inspiration die', total('Perception'), /\+1d6$/);
  await total('Perception').locator('[role=button]').click();
  await p.getByRole('button', { name: /^Roll log/ }).click();
  const entries = p.locator('[data-roll]');
  await entries.first().waitFor();
  await expectText('skill roll adds the die', entries.last(), /inspiration/i);
  const n = await entries.count();
  await entries.last().getByRole('button', { name: /^Reroll/ }).click();
  await p.waitForFunction((k) => document.querySelectorAll('[data-roll]').length === k, n + 1);
  check('reroll adds a log entry', (await entries.count()) === n + 1);
  await p.getByRole('button', { name: 'Close', exact: true }).click();
  await addMacro('Blur');
  await expectText('blur conceals', p.locator('[data-section=defense]').getByTitle(/Miss chance/).first(), /Concealed\s+20%/i);
  await edit('macros');

  console.log('— natural armor and resources');
  await edit('defense');
  await p.getByLabel('Natural armor bonus').fill('2');
  await p.getByLabel('Natural armor bonus').blur();
  await edit('defense');
  await expectStat('AC', '22', p);
  await expectStat('Touch', '12', p);
  await p.getByRole('button', { name: 'Spend one Grit' }).click();
  await expectText('resource current = max − used', p.locator('[data-section=readiness] td[data-label=Current]').first(), /^0$/);

  console.log('— textarea sizes persist');
  await p.goto(`${args.url}/#character`);
  const story = p.locator('[data-section=bio] textarea').last();
  const before = await story.evaluate((el) => el.offsetHeight);
  await story.dispatchEvent('pointerdown');
  await story.evaluate((el) => (el.style.height = '150px'));
  await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup')));
  await p.waitForTimeout(600); // saved with the character (debounced)
  await p.reload();
  check('resized textarea keeps its height after reload', (await story.evaluate((el) => el.offsetHeight)) === 150, String(await story.evaluate((el) => el.offsetHeight)));
  await p.getByRole('button', { name: /^Reset text box sizes/ }).click();
  check('reset sizes restores the default height', (await story.evaluate((el) => el.offsetHeight)) === before, `${before} vs ${await story.evaluate((el) => el.offsetHeight)}`);
  check('reset button hides after reset', (await p.getByRole('button', { name: /^Reset text box sizes/ }).count()) === 0);
  await ctx.close();
}

if (errors.length) {
  failed += errors.length;
  console.log('page errors:', errors);
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
await browser.close();
process.exit(failed ? 1 : 0);
