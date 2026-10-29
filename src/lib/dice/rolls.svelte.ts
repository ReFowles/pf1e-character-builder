// Roll log store and the one entry point for rolling anything on the sheet.
import { prefs } from '../prefs.svelte';
import { app } from '../state.svelte';
import { parseNotation } from './notation';
import { buildResult, capLog, rollDice, throwNotation, type RollResult, type RollSpec } from './roll';

const KEY = 'pf1e:rolls';
const THREE_D_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);

function load(): RollResult[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? capLog(raw.filter((r) => r && typeof r.total === 'number')) : [];
  } catch {
    return [];
  }
}

class RollLog {
  /** Oldest first. */
  entries = $state<RollResult[]>(load());
  unread = $state(0);
  open = $state(false);
  /** A 3D roll is in flight. */
  busy = $state(false);

  add(r: RollResult) {
    this.entries = capLog([...this.entries, r]);
    if (!this.open) this.unread++;
    localStorage.setItem(KEY, JSON.stringify($state.snapshot(this.entries)));
  }

  /** Delete one logged roll. */
  remove(id: string) {
    this.entries = this.entries.filter((e) => e.id !== id);
    localStorage.setItem(KEY, JSON.stringify($state.snapshot(this.entries)));
  }

  clear() {
    this.entries = [];
    this.unread = 0;
    localStorage.removeItem(KEY);
  }

  toggle(open = !this.open) {
    this.open = open;
    if (open) this.unread = 0;
  }
}

export const rolls = new RollLog();

/** Roll a spec (3D when enabled, instant otherwise or on any 3D failure), log it and toast the total. */
export async function roll(spec: RollSpec): Promise<RollResult | null> {
  const n = parseNotation(spec.notation);
  if (!n) {
    app.notify(`Can't roll "${spec.notation}"`);
    return null;
  }
  let result: RollResult | null = null;
  const thrown = throwNotation(spec, n);
  // The 3D set has the standard dice only; anything else (custom-sided dice) rolls instantly.
  if (prefs.dice.threeD && !rolls.busy && thrown.dice.every((t) => THREE_D_SIDES.has(t.sides))) {
    rolls.busy = true;
    try {
      const { roll3d } = await import('./three-d');
      result = buildResult(spec, n, await roll3d(thrown, { color: prefs.dice.color, scale: prefs.dice.scale }), '3d');
    } catch (e) {
      console.warn('3D dice unavailable, rolling instantly', e);
    } finally {
      rolls.busy = false;
    }
  }
  result ??= buildResult(spec, n, rollDice(thrown), 'instant');
  rolls.add(result);
  app.notify(`${spec.title}: ${result.total}`);
  return result;
}
