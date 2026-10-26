import type { DbData } from './types';

export type DbKind = keyof DbData;

const cache: Partial<Record<DbKind, Promise<unknown[]>>> = {};

/** Fetch one data file on first use; the service worker keeps it offline. */
export function loadDb<K extends DbKind>(kind: K): Promise<DbData[K]> {
  cache[kind] ??= fetch(`${import.meta.env.BASE_URL}data/${kind}.json`).then((r) => {
    if (!r.ok) throw new Error(`Could not load ${kind} (${r.status})`);
    return r.json();
  });
  return cache[kind] as Promise<DbData[K]>;
}

/** Case-insensitive name search: prefix matches first, then word and substring matches. */
export function searchByName<T extends { name: string }>(entries: T[], query: string, limit = 25): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: [number, T][] = [];
  for (const e of entries) {
    const n = e.name.toLowerCase();
    const i = n.indexOf(q);
    if (i < 0) continue;
    scored.push([i === 0 ? 0 : /\W/.test(n[i - 1]) ? 1 : 2, e]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].name.length - b[1].name.length)
    .slice(0, limit)
    .map(([, e]) => e);
}
