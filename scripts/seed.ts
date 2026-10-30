// Shared by checks.ts and shots.ts: load a fixture character before the app starts.
import type { Page } from 'playwright';

/** Make `character` the only (and active) character and skip the walkthrough, once per browser session. */
export function seedCharacter(page: Page, character: { id: string; info: { name: string } }) {
  return page.addInitScript((c) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem(`pf1e:char:${c.id}`, JSON.stringify(c));
    localStorage.setItem('pf1e:roster', JSON.stringify([{ id: c.id, name: c.info.name, updatedAt: 0 }]));
    localStorage.setItem('pf1e:active', c.id);
    localStorage.setItem('pf1e:prefs', JSON.stringify({ tourSeen: true }));
  }, character);
}
