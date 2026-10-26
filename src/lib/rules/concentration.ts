/** Concentration check DCs (Core Rulebook, Table 9-1), by spell level. */
export const CONCENTRATION_DCS: { situation: string; dc: (spellLevel: number) => string }[] = [
  { situation: 'Casting defensively', dc: (l) => `${15 + 2 * l}` },
  { situation: 'Injured while casting', dc: (l) => `10 + damage + ${l}` },
  { situation: 'Continuous damage', dc: (l) => `10 + ½ damage + ${l}` },
  { situation: 'Affected by a non-damaging spell', dc: (l) => `that spell's DC + ${l}` },
  { situation: 'Grappled or pinned', dc: (l) => `10 + grappler's CMB + ${l}` },
  { situation: 'Entangled', dc: (l) => `${15 + l}` },
  { situation: 'Vigorous motion', dc: (l) => `${10 + l}` },
  { situation: 'Violent motion', dc: (l) => `${15 + l}` },
  { situation: 'Extremely violent motion', dc: (l) => `${20 + l}` },
  { situation: 'Wind with rain or sleet', dc: (l) => `${5 + l}` },
  { situation: 'Wind with hail and debris', dc: (l) => `${10 + l}` },
];
