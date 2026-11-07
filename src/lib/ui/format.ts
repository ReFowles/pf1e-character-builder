import type { Total } from '../rules/bonuses';
import { round2 } from '../rules/math';

/** Signed modifier: +3, -1, +0. */
export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Multi-line breakdown for a tooltip. */
export function breakdown(t: Total): string {
  return t.parts
    .map((p) => `${fmt(p.value)} ${p.source}${p.type !== 'untyped' ? ` (${p.type})` : ''}${p.applied ? '' : ' — not stacking'}`)
    .join('\n');
}

export const lb = (n: number) => `${round2(n)} lb`;

/** Gold pieces with thousands separators, up to 2 decimals. */
export const gp = (n: number) => `${round2(n).toLocaleString(undefined, { maximumFractionDigits: 2 })} gp`;

/** Extra dice as an addition: "1d6" → "+1d6"; flat amounts keep their sign ("+3", "-1"). */
export const plusNotation = (notation: string) => (/^[+-]/.test(notation) ? notation : `+${notation}`);
