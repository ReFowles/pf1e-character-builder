// Pure roll results: instant and 3D rolls both end up in this shape, so the log
// treats them the same.
import type { Total } from '../rules/bonuses';
import { formatNotation, parseNotation, type Notation } from './notation';
import { cryptoRng, type Rng } from './rng';

export interface RollPart {
  source: string;
  value: number;
}

export interface DieResult {
  sides: number;
  value: number;
  sign: 1 | -1;
}

export interface RollSpec {
  title: string;
  subtitle?: string;
  notation: string;
  /** Where the flat modifier comes from (shown under the dice). */
  parts?: RollPart[];
}

export interface RollResult {
  id: string;
  title: string;
  subtitle?: string;
  notation: string;
  dice: DieResult[];
  modifier: number;
  parts: RollPart[];
  total: number;
  at: number;
  mode: 'instant' | '3d';
}

export function rollDice(n: Notation, rng: Rng = cryptoRng): DieResult[] {
  return n.dice.flatMap((t) => Array.from({ length: t.count }, () => ({ sides: t.sides, value: rng(t.sides), sign: t.sign })));
}

export function buildResult(spec: RollSpec, n: Notation, dice: DieResult[], mode: RollResult['mode']): RollResult {
  const total = dice.reduce((s, d) => s + d.sign * d.value, 0) + n.modifier;
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: spec.title,
    subtitle: spec.subtitle,
    notation: formatNotation(n),
    dice,
    modifier: n.modifier,
    parts: spec.parts ?? [],
    total,
    at: Date.now(),
    mode,
  };
}

/** Roll right now with the given generator; null for unparsable notation. */
export function rollInstant(spec: RollSpec, rng: Rng = cryptoRng): RollResult | null {
  const n = parseNotation(spec.notation);
  return n ? buildResult(spec, n, rollDice(n, rng), 'instant') : null;
}

/** The applied parts of a derived total, in the log's shape (same sources as the hover breakdown). */
export function partsOf(t: Total): RollPart[] {
  return t.parts.filter((p) => p.applied).map((p) => ({ source: `${p.source}${p.type !== 'untyped' ? ` (${p.type})` : ''}`, value: p.value }));
}

export const LOG_CAP = 200;

/** Keep the newest `max` entries. */
export function capLog(entries: RollResult[], max = LOG_CAP): RollResult[] {
  return entries.length > max ? entries.slice(entries.length - max) : entries;
}
