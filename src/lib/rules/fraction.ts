// Small rational helpers for favored class bonuses like "1/3" or "1/6".

export interface Fraction {
  n: number;
  d: number;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

export function parseFraction(s: string): Fraction {
  const m = s.trim().match(/^(-?\d+)(?:\s*\/\s*(\d+))?$/);
  if (!m) return { n: 0, d: 1 };
  const d = Number(m[2] ?? 1) || 1;
  return reduce({ n: Number(m[1]), d });
}

function reduce({ n, d }: Fraction): Fraction {
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}

export const addFractions = (a: Fraction, b: Fraction): Fraction => reduce({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });

export function formatFraction({ n, d }: Fraction): string {
  if (d === 1) return String(n);
  const whole = Math.trunc(n / d);
  const rest = Math.abs(n % d);
  return whole ? `${whole} ${rest}/${d}` : `${n}/${d}`;
}
