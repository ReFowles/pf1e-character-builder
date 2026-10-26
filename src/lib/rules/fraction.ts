// Small rational helpers for favored class bonuses like "1/3" or "1/6".
// Sums keep the denominators players entered (1/6 + 1/6 + 1/6 = 3/6), so they
// read like the class's FCB text instead of being reduced.

export interface Fraction {
  n: number;
  d: number;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

export function parseFraction(s: string): Fraction {
  const m = s.trim().match(/^(-?\d+)(?:\s*\/\s*(\d+))?$/);
  if (!m) return { n: 0, d: 1 };
  return { n: Number(m[1]), d: Number(m[2] ?? 1) || 1 };
}

/** Add over the least common denominator, without reducing the result. */
export function addFractions(a: Fraction, b: Fraction): Fraction {
  const d = lcm(a.d, b.d);
  return { n: a.n * (d / a.d) + b.n * (d / b.d), d };
}

export function formatFraction({ n, d }: Fraction): string {
  if (d === 1) return String(n);
  const whole = Math.trunc(n / d);
  const rest = Math.abs(n % d);
  if (!rest) return String(whole);
  return whole ? `${whole} ${rest}/${d}` : `${n}/${d}`;
}
