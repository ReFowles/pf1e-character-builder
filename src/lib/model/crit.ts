// A weapon's critical text is stored as a threat range (20 for a plain natural 20)
// and a multiplier. Text like "19-20/×2" (from the database or older saves) is split.

export function splitCrit(text: string): { critRange: number; crit: string } {
  const range = text.match(/^\s*(\d+)\s*-\s*20\s*\/\s*(.*)$/);
  if (range) return { critRange: Number(range[1]), crit: range[2].trim() || '×2' };
  const plain = text.match(/^\s*20\s*\/\s*(.*)$/);
  if (plain) return { critRange: 20, crit: plain[1].trim() || '×2' };
  return { critRange: 20, crit: text.trim() || '×2' };
}
