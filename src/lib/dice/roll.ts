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
  /** Multiplies the whole total (critical hits in "total" mode). Default 1. */
  multiplier?: number;
  /** Where the flat modifier comes from (shown under the dice). */
  parts?: RollPart[];
  /** Extra damage thrown with the main dice and added after the multiplier, e.g. { label: 'fire', notation: '1d6' }. */
  extras?: { label: string; notation: string }[];
}

export interface ExtraResult {
  label: string;
  notation: string;
  dice: DieResult[];
  modifier: number;
  total: number;
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
  /** Applied to the total of dice and modifier. */
  multiplier: number;
  /** Added to the total after the multiplier. */
  extras?: ExtraResult[];
  at: number;
  mode: 'instant' | '3d';
}

export function rollDice(n: Notation, rng: Rng = cryptoRng): DieResult[] {
  return n.dice.flatMap((t) => Array.from({ length: t.count }, () => ({ sides: t.sides, value: rng(t.sides), sign: t.sign })));
}

const diceCount = (n: Notation) => n.dice.reduce((s, t) => s + t.count, 0);
const diceSum = (dice: DieResult[]) => dice.reduce((s, d) => s + d.sign * d.value, 0);

function parsedExtras(spec: RollSpec) {
  return (spec.extras ?? []).flatMap((e) => {
    const n = parseNotation(e.notation);
    return n ? [{ label: e.label, n }] : [];
  });
}

/** Every die a spec throws: the main notation's, then each extra's, in order. */
export function throwNotation(spec: RollSpec, n: Notation): Notation {
  return { dice: [...n.dice, ...parsedExtras(spec).flatMap((e) => e.n.dice)], modifier: n.modifier };
}

/** `dice` is the throw from `throwNotation`: the main dice come first, then each extra's. */
export function buildResult(spec: RollSpec, n: Notation, dice: DieResult[], mode: RollResult['mode']): RollResult {
  const multiplier = spec.multiplier ?? 1;
  let at = diceCount(n);
  const extras: ExtraResult[] = parsedExtras(spec).map((e) => {
    const own = dice.slice(at, (at += diceCount(e.n)));
    return { label: e.label, notation: formatNotation(e.n), dice: own, modifier: e.n.modifier, total: diceSum(own) + e.n.modifier };
  });
  const main = dice.slice(0, diceCount(n));
  const total = (diceSum(main) + n.modifier) * multiplier + extras.reduce((s, e) => s + e.total, 0);
  return {
    multiplier,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: spec.title,
    subtitle: spec.subtitle,
    notation: formatNotation(n),
    dice: main,
    modifier: n.modifier,
    parts: spec.parts ?? [],
    total,
    ...(extras.length ? { extras } : {}),
    at: Date.now(),
    mode,
  };
}

/** Roll right now with the given generator; null for unparsable notation. */
export function rollInstant(spec: RollSpec, rng: Rng = cryptoRng): RollResult | null {
  const n = parseNotation(spec.notation);
  return n ? buildResult(spec, n, rollDice(throwNotation(spec, n), rng), 'instant') : null;
}

/** The applied parts of a derived total, in the log's shape (same sources as the hover breakdown). */
export function partsOf(t: Total): RollPart[] {
  // "Enhancement" with the type "enhancement" reads as just "(enhancement)"; other typed bonuses keep both.
  const label = (p: { source: string; type: string }) => {
    if (p.type === 'untyped') return p.source;
    return p.source.toLowerCase() === p.type ? `(${p.type})` : `${p.source} (${p.type})`;
  };
  return t.parts.filter((p) => p.applied).map((p) => ({ source: label(p), value: p.value }));
}

export const LOG_CAP = 200;

/** Keep the newest `max` entries. */
export function capLog(entries: RollResult[], max = LOG_CAP): RollResult[] {
  return entries.length > max ? entries.slice(entries.length - max) : entries;
}
