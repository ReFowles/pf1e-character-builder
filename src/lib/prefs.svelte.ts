// Per-device preferences (not saved with characters): dice options and the
// first-run walkthrough flag. Dark mode has its own store in theme.svelte.ts.

export interface Prefs {
  dice: { threeD: boolean; color: string; scale: number };
  tourSeen: boolean;
}

import { readJson } from './storage/json';

const KEY = 'pf1e:prefs';
const DEFAULTS: Prefs = { dice: { threeD: false, color: '#7a1f1f', scale: 6 }, tourSeen: false };

function load(): Prefs {
  const raw = readJson<Partial<Prefs>>(KEY, {});
  return { ...DEFAULTS, ...raw, dice: { ...DEFAULTS.dice, ...(raw.dice ?? {}) } };
}

class PrefsStore {
  data = $state<Prefs>(load());

  constructor() {
    $effect.root(() => {
      $effect(() => {
        localStorage.setItem(KEY, JSON.stringify($state.snapshot(this.data)));
      });
    });
  }

  get dice() {
    return this.data.dice;
  }
}

export const prefs = new PrefsStore();
