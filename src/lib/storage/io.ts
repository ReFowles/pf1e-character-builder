import { uid } from '../model/id';
import { normalize } from '../model/normalize';
import type { Character } from '../model/types';

export function fileName(c: Character): string {
  const base = (c.info.name || 'character').trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-');
  return `${base || 'character'}.pf1e.json`;
}

export function exportJson(c: Character) {
  const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName(c);
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse an exported file into a fresh character with a new id. */
export function parseImport(text: string): Character {
  const c = normalize(JSON.parse(text));
  c.id = uid();
  return c;
}

/** Open a file picker and read the chosen JSON file. */
export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => resolve((await input.files?.[0]?.text()) ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
