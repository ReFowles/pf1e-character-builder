import { newCharacter } from './model/defaults';
import { uid } from './model/id';
import { normalize } from './model/normalize';
import type { Character, SectionUi } from './model/types';
import { derive } from './rules/derive';
import { exportJson, parseImport, pickJsonFile } from './storage/io';
import {
  StorageFullError,
  deleteCharacter,
  getActiveId,
  loadCharacter,
  loadRoster,
  saveCharacter,
  setActiveId,
  type RosterEntry,
} from './storage/local';

export const TABS = ['core', 'character', 'companions', 'spells', 'mythic', 'settings'] as const;
export type Tab = (typeof TABS)[number];

const tabFromHash = (): Tab => {
  const raw = location.hash.slice(1);
  const h = (raw === 'combat' ? 'core' : raw) as Tab; // #combat was the Core tab's old name
  return TABS.includes(h) ? h : 'core';
};

const DEFAULT_SECTION: SectionUi = { hidden: false, collapsed: false, printHidden: false };

class AppState {
  roster = $state<RosterEntry[]>([]);
  char = $state<Character>(newCharacter());
  d = $derived(derive(this.char));
  /** Tabs this character uses; Companions and Mythic only once enabled in Settings. */
  tabs = $derived(
    TABS.filter((t) => (t !== 'mythic' || this.char.mythic.enabled) && (t !== 'companions' || this.char.companionTab)),
  );
  tab = $state<Tab>(tabFromHash());
  toast = $state<string | null>(null);

  constructor() {
    this.roster = loadRoster();
    const active = getActiveId();
    const loaded = (active && loadCharacter(active)) || (this.roster[0] && loadCharacter(this.roster[0].id));
    if (loaded) this.char = loaded;
    else this.persist(this.char);
    // Old bookmarks use #combat; rewrite them to #core without adding a history entry.
    if (location.hash === '#combat') history.replaceState(null, '', '#core');
    addEventListener('hashchange', () => (this.tab = tabFromHash()));
  }

  setTab(tab: Tab) {
    location.hash = tab;
    this.tab = tab;
  }

  section(id: string): SectionUi {
    return { ...DEFAULT_SECTION, ...this.char.ui.sections[id] };
  }

  setSection(id: string, patch: Partial<SectionUi>) {
    this.char.ui.sections[id] = { ...this.section(id), ...patch };
  }

  notify(message: string) {
    this.toast = message;
    setTimeout(() => {
      if (this.toast === message) this.toast = null;
    }, 4000);
  }

  /** Save a character; reports storage errors as a toast. */
  persist(c: Character) {
    try {
      this.roster = saveCharacter(c);
      setActiveId(c.id);
    } catch (e) {
      this.notify(e instanceof StorageFullError ? e.message : `Save failed: ${e}`);
    }
  }

  switchTo(id: string) {
    const c = loadCharacter(id);
    if (!c) return this.notify('Could not load that character.');
    this.persist($state.snapshot(this.char));
    this.char = c;
    setActiveId(id);
  }

  create() {
    this.persist($state.snapshot(this.char));
    this.char = newCharacter();
    this.persist(this.char);
  }

  duplicate() {
    const copy = normalize($state.snapshot(this.char));
    copy.id = uid();
    copy.info.name = `${copy.info.name || 'Unnamed'} (copy)`;
    this.persist($state.snapshot(this.char));
    this.char = copy;
    this.persist(copy);
  }

  remove() {
    const name = this.char.info.name || 'this unnamed character';
    if (!confirm(`Delete ${name}? Export it first if you might want it back.`)) return;
    this.roster = deleteCharacter(this.char.id);
    const next = this.roster[0] && loadCharacter(this.roster[0].id);
    this.char = next || newCharacter();
    this.persist(this.char);
  }

  exportJson() {
    exportJson($state.snapshot(this.char));
  }

  async importJson() {
    const text = await pickJsonFile();
    if (!text) return;
    try {
      const c = parseImport(text);
      this.persist($state.snapshot(this.char));
      this.char = c;
      this.persist(c);
      this.notify(`Imported ${c.info.name || 'character'}.`);
    } catch (e) {
      this.notify(`Import failed: ${e instanceof Error ? e.message : e}`);
    }
  }
}

export const app = new AppState();
