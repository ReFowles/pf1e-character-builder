import { normalize } from '../model/normalize';
import type { Character } from '../model/types';

const ROSTER_KEY = 'pf1e:roster';
const ACTIVE_KEY = 'pf1e:active';
const charKey = (id: string) => `pf1e:char:${id}`;

export interface RosterEntry {
  id: string;
  name: string;
  updatedAt: number;
}

export class StorageFullError extends Error {
  constructor() {
    super('Browser storage is full. Export your characters as JSON, then remove some.');
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') throw new StorageFullError();
    throw e;
  }
}

export function loadRoster(): RosterEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ROSTER_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveRoster(roster: RosterEntry[]) {
  write(ROSTER_KEY, JSON.stringify(roster));
}

export function loadCharacter(id: string): Character | null {
  const raw = localStorage.getItem(charKey(id));
  if (!raw) return null;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Save a character and upsert its roster entry. Returns the new roster. */
export function saveCharacter(c: Character): RosterEntry[] {
  write(charKey(c.id), JSON.stringify(c));
  const roster = loadRoster();
  const entry = { id: c.id, name: c.info.name, updatedAt: Date.now() };
  const i = roster.findIndex((r) => r.id === c.id);
  if (i >= 0) roster[i] = entry;
  else roster.push(entry);
  saveRoster(roster);
  return roster;
}

export function deleteCharacter(id: string): RosterEntry[] {
  localStorage.removeItem(charKey(id));
  const roster = loadRoster().filter((r) => r.id !== id);
  saveRoster(roster);
  return roster;
}

export const getActiveId = () => localStorage.getItem(ACTIVE_KEY);
export const setActiveId = (id: string) => write(ACTIVE_KEY, id);
