// Screenshot the app for agentic review.
// Usage: node scripts/shots.ts [--url http://localhost:5173] [--fixture scripts/fixtures/x.json]
//        [--tabs combat,character] [--widths 1280,390] [--pdf] [--full]
import { mkdirSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:5173' },
    fixture: { type: 'string' },
    tabs: { type: 'string', default: 'combat,character,spells' },
    widths: { type: 'string', default: '1280,390' },
    pdf: { type: 'boolean', default: false },
    full: { type: 'boolean', default: true },
  },
});

const out = '.shots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });

async function open(width: number) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
  if (args.fixture) {
    const c = JSON.parse(readFileSync(args.fixture, 'utf8'));
    await page.addInitScript((c) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      localStorage.setItem(`pf1e:char:${c.id}`, JSON.stringify(c));
      localStorage.setItem('pf1e:roster', JSON.stringify([{ id: c.id, name: c.info.name, updatedAt: 0 }]));
      localStorage.setItem('pf1e:active', c.id);
    }, c);
  }
  return page;
}

for (const width of args.widths.split(',').map(Number)) {
  const page = await open(width);
  for (const tab of args.tabs.split(',')) {
    await page.goto(`${args.url}/#${tab}`);
    await page.waitForTimeout(300);
    const file = `${out}/${tab}-${width}.png`;
    await page.screenshot({ path: file, fullPage: args.full });
    console.log(file);
  }
  await page.close();
}

if (args.pdf) {
  const page = await open(1280);
  await page.goto(args.url);
  await page.waitForTimeout(300);
  await page.pdf({ path: `${out}/sheet.pdf`, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  console.log(`${out}/sheet.pdf`);
}

await browser.close();
