import { ABILITIES, type Ability, type Character } from '../model/types';

export const POINT_BUY_MIN = 7;
export const POINT_BUY_MAX = 18;

/** Standard budgets (PF1 core: Low Fantasy 10, Standard 15, High 20, Epic 25). */
export const POINT_BUY_BUDGETS = [
  { value: 10, label: 'Low fantasy (10 points)' },
  { value: 15, label: 'Standard (15 points)' },
  { value: 20, label: 'High fantasy (20 points)' },
  { value: 25, label: 'Epic fantasy (25 points)' },
];

/** Cost of each step up from 10. Scores below 10 refund points in both tables. */
const STANDARD_STEPS: Record<number, number> = { 11: 1, 12: 1, 13: 1, 14: 2, 15: 2, 16: 3, 17: 3, 18: 4 };
/** Richard's Point Buy: 11-14 cost 1 each, 15-16 cost 2, 17-18 cost 3. */
const RICHARD_STEPS: Record<number, number> = { 11: 1, 12: 1, 13: 1, 14: 1, 15: 2, 16: 2, 17: 3, 18: 3 };
const REFUNDS: Record<number, number> = { 9: 1, 8: 1, 7: 2 };

/** Total point cost of a base score (negative below 10); scores outside 7-18 are clamped. */
export function pointCost(score: number, richard = false): number {
  const s = Math.min(POINT_BUY_MAX, Math.max(POINT_BUY_MIN, Math.round(score)));
  const steps = richard ? RICHARD_STEPS : STANDARD_STEPS;
  let cost = 0;
  if (s > 10) for (let i = 11; i <= s; i++) cost += steps[i];
  else for (let i = 9; i >= s; i--) cost -= REFUNDS[i];
  return cost;
}

export function pointBuy(c: Character) {
  const { budget, freeEighteen, richard } = c.pointBuy;
  const costs = {} as Record<Ability, number>;
  let spent = 0;
  for (const a of ABILITIES) spent += costs[a] = pointCost(c.abilities[a].base, richard);
  // One 18 is free: refund its cost once.
  if (freeEighteen && ABILITIES.some((a) => c.abilities[a].base === 18)) spent -= pointCost(18, richard);
  return { spent, remaining: budget - spent, costs };
}
