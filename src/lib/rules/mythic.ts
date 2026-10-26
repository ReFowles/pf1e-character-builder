import type { MythicPath } from '../model/types';

/** Bonus hit points gained per mythic tier, by path. */
export const PATH_HP: Record<MythicPath, number> = {
  archmage: 3,
  champion: 5,
  guardian: 5,
  hierophant: 4,
  marshal: 4,
  trickster: 4,
};

export const mythicPowerMax = (tier: number) => 3 + 2 * tier;

export function surgeDie(tier: number): string {
  if (tier >= 10) return '1d12';
  if (tier >= 7) return '1d10';
  if (tier >= 4) return '1d8';
  return '1d6';
}

/** Tiers that grant a +2 ability score increase. */
export const ABILITY_INCREASE_TIERS = [2, 4, 6, 8, 10];

/** Abilities every mythic character gains, by tier. */
export const BASE_MYTHIC_ABILITIES: { tier: number; name: string; summary: string }[] = [
  { tier: 1, name: 'Hard to Kill', summary: 'Automatically stabilize; die only at negative Con + tier hp.' },
  { tier: 1, name: 'Mythic Power', summary: 'Use mythic power (3 + 2×tier/day) to fuel abilities.' },
  { tier: 1, name: 'Surge', summary: 'Spend 1 mythic power to add the surge die to a d20 roll.' },
  { tier: 2, name: 'Amazing Initiative', summary: '+tier on initiative; spend power for an extra standard action.' },
  { tier: 3, name: 'Recuperation', summary: 'Regain hit points and power with 8 hours of rest.' },
  { tier: 4, name: 'Mythic Saving Throws', summary: 'On a successful save vs a non-mythic effect, take no effect.' },
  { tier: 5, name: 'Force of Will', summary: 'Spend power to reroll or force a reroll.' },
  { tier: 7, name: 'Unstoppable', summary: 'Spend power to end a bleed, blind, confused… condition.' },
  { tier: 8, name: 'Immortal', summary: 'Return to life 24 hours after being killed.' },
  { tier: 9, name: 'Legendary Item', summary: 'Gain a legendary item.' },
  { tier: 10, name: 'True Mythic', summary: 'Mythic power is greatly enhanced.' },
];
