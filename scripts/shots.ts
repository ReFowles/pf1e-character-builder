// Screenshot the app for agentic review.
// Usage: node scripts/shots.ts [--url http://localhost:5173] [--fixture scripts/fixtures/x.json]
//        [--tabs core,character] [--widths 1280,390] [--pdf] [--full] [--dark]
import { mkdirSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:5173' },
    fixture: { type: 'string' },
    tabs: { type: 'string', default: 'core,character,spells' },
    widths: { type: 'string', default: '1280,390' },
    pdf: { type: 'boolean', default: false },
    // Emulate an OS dark preference (the app follows it until toggled).
    dark: { type: 'boolean', default: false },
    full: { type: 'boolean', default: true },
    // Split full-page shots into chunks of this many px (easier to inspect).
    slice: { type: 'string' },
  },
});

const out = '.shots';
const suffix = args.dark ? '-dark' : '';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });

async function open(width: number) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: args.dark ? 'dark' : 'light' });
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
    const file = `${out}/${tab}-${width}${suffix}.png`;
    await page.screenshot({ path: file, fullPage: args.full });
    console.log(file);
    if (args.slice) {
      const step = Number(args.slice);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0, i = 0; y < height; y += step, i++) {
        const part = `${out}/${tab}-${width}${suffix}-${i}.png`;
        await page.screenshot({ path: part, fullPage: true, clip: { x: 0, y, width, height: Math.min(step, height - y) } });
        console.log(part);
      }
    }
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
