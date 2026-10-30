/** Lowercase, non-alphanumerics to single dashes, no leading or trailing dash: "Arcane Trickster" → "arcane-trickster". */
export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
