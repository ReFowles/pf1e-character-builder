import { uid } from './id';
import { splitCrit } from './crit';
import { isClassSkill } from '../rules/skills';
import { RETIRED_MACRO_FEATS, bonusRowsFor, featKey } from '../rules/featBonuses';

type Plain = Record<string, any>;

const arr = (v: unknown): Plain[] => (Array.isArray(v) ? v : []);

/** Parse a price like "15 gp", "5 sp" or "1,200" into gp. */
export function parseGp(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return 0;
  const m = raw.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(pp|gp|sp|cp)?/i);
  if (!m) return 0;
  const rate = { pp: 10, gp: 1, sp: 0.1, cp: 0.01 }[(m[2] ?? 'gp').toLowerCase() as 'gp'];
  return Math.round(Number(m[1]) * rate * 100) / 100;
}

/** "+ 1/3 Damage to Channel" -> { amount: '1/3', label: 'Damage to Channel' }. */
export function parseFcbNote(note: string): { amount: string; label: string } {
  const m = note.trim().match(/^\+?\s*(\d+(?:\s*\/\s*\d+)?)\s+(.*)$/);
  if (!m) return { amount: '1', label: note.trim() };
  return { amount: m[1].replace(/\s+/g, ''), label: m[2].trim() };
}

/**
 * Upgrade steps keyed by the version they upgrade *from*. Each step receives
 * data at version N and returns data at version N + 1.
 */
const STEPS: Record<number, (d: Plain) => Plain> = {
  1: (d) => {
    // Speeds: fixed fly/swim/climb/burrow fields become a list.
    const sp = d.speeds ?? {};
    const other = ['fly', 'swim', 'climb', 'burrow']
      .filter((mode) => Number(sp[mode]) > 0)
      .map((mode) => ({
        id: uid(),
        mode,
        value: Number(sp[mode]),
        maneuverability: mode === 'fly' ? (sp.flyManeuverability ?? '') : '',
      }));
    const speeds = { base: sp.base ?? 30, armored: sp.armored ?? 0, other };

    // FCB notes become label + amount.
    const levels = arr(d.levels).map((l) => {
      const fcb = l.fcb ?? {};
      if (fcb.kind !== 'other' || typeof fcb.note !== 'string' || !fcb.note.trim()) {
        return { ...l, fcb: { kind: fcb.kind ?? 'hp', label: '', amount: '' } };
      }
      return { ...l, fcb: { kind: 'other', ...parseFcbNote(fcb.note) } };
    });

    // Items: free-text value becomes a gp price.
    const items = arr(d.items).map(({ value, ...it }) => ({ ...it, price: parseGp(value) }));

    // Knowledge rows: keep only used ones and class skills.
    const classSkills = arr(d.classes).flatMap((k) => arr(k.classSkills) as unknown as string[]);
    let skills = arr(d.skills).filter(
      (s) =>
        s.skill !== 'knowledge' ||
        Number(s.ranks) > 0 ||
        (Number(s.misc) || 0) !== 0 ||
        s.favorite ||
        s.classSkill === true ||
        isClassSkill(classSkills, 'knowledge', s.subtype),
    );
    if (Array.isArray(d.skills) && !skills.some((s) => s.skill === 'knowledge')) {
      // Keep one blank row so Knowledge still appears in the list.
      const at = arr(d.skills).findIndex((s) => s.skill === 'knowledge');
      skills = [...skills];
      skills.splice(Math.max(0, at), 0, { id: uid(), skill: 'knowledge', subtype: '', ranks: 0, favorite: false, misc: 0 });
    }

    return { ...d, speeds, levels, items, ...(Array.isArray(d.skills) ? { skills } : {}) };
  },
};

STEPS[2] = (d) => {
  // Magic items become equipped gear.
  const fromMagic = arr(d.magicItems).map((m) => ({
    id: m.id ?? uid(),
    name: m.name ?? '',
    quantity: 1,
    weight: Number(m.weight) || 0,
    price: Number(m.price) || 0,
    equipped: true,
    slot: m.slot ?? 'slotless',
    notes: m.notes ?? '',
  }));
  const { magicItems: _m, ...rest } = d;
  return {
    ...rest,
    items: [...arr(d.items), ...fromMagic],
    favoriteOrder: arr(d.skills).filter((s) => s.favorite).map((s) => s.id),
    spellcasting: arr(d.spellcasting).map((b) => ({ ...b, domainSlot: b.domainSlot ?? b.table === 'cleric' })),
  };
};

STEPS[3] = (d) => {
  // Tier misc becomes the Mythic Paragon checkbox (+2 potency only).
  const { tierMisc, ...mythic } = (d.mythic ?? {}) as Plain;
  // Each spellcasting block is now its own section; carry over the old shared section's toggles.
  const sections = { ...((d.ui as Plain | undefined)?.sections as Plain | undefined) };
  const old = sections.spellcasting;
  delete sections.spellcasting;
  if (old) for (const b of arr(d.spellcasting)) sections[`spells-${b.id}`] ??= { ...old };
  return {
    ...d,
    mythic: { ...mythic, paragon: (Number(tierMisc) || 0) >= 2, surgeUpgrades: 0 },
    ui: { ...((d.ui as Plain | undefined) ?? {}), sections },
  };
};

STEPS[4] = (d) => ({
  ...d,
  // "Other" blocks get their own base caster level; misc becomes a real modifier.
  spellcasting: arr(d.spellcasting).map((b) =>
    b.classId ? b : { ...b, casterLevel: Number(b.casterLevelMisc) || 0, casterLevelMisc: 0 },
  ),
});

STEPS[5] = (d) => {
  // The Core tab's id is now "core" (it was "combat"); carry over its print toggle.
  const ui = (d.ui ?? {}) as Plain;
  const sections = { ...((ui.sections as Plain | undefined) ?? {}) };
  if (sections['tab:combat']) {
    sections['tab:core'] ??= sections['tab:combat'];
    delete sections['tab:combat'];
  }
  return { ...d, ui: { ...ui, sections } };
};

STEPS[6] = (d) => {
  const { favoredClassId, ...rest } = d;
  // Always-on feat macros (Improved Initiative, Toughness…) became bonus rows
  // or derive() rules keyed on the feat's name; keep the numbers by converting.
  const feats = arr(d.feats);
  const bonuses = arr(d.bonuses);
  const macros = arr(d.macros).filter((m) => {
    const feat = RETIRED_MACRO_FEATS[m.libraryId] ?? (featKey(String(m.name ?? '')) === String(m.name ?? '').trim() ? String(m.name).trim() : undefined);
    if (!feat || m.active === false) return true;
    if (!feats.some((f) => featKey(String(f.name ?? '')) === feat)) feats.push({ id: uid(), name: feat, level: 1, source: 'Level', type: '', description: '' });
    if (!bonuses.some((b) => b.source === feat)) bonuses.push(...bonusRowsFor(feat, uid));
    return false;
  });
  return {
    ...rest,
    favoredClassIds: favoredClassId ? [favoredClassId] : [],
    feats,
    bonuses,
    macros,
    // Resistance chips are one text: "fire 10"; the separate amount field is gone.
    resistances: arr(d.resistances).map(({ value, ...r }) => ({ ...r, name: [r.name, value].map((x) => String(x ?? '').trim()).filter(Boolean).join(' ') })),
  };
};

STEPS[7] = (d) => ({
  ...d,
  // Weapon critical text ("19-20/×2") becomes a threat range and a multiplier.
  weapons: arr(d.weapons).map((w) => ({ ...w, ...splitCrit(String(w.crit ?? '')) })),
});

export function migrate(data: Plain): Plain {
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 1;
  let out = data;
  while (STEPS[version]) {
    out = STEPS[version](out);
    version += 1;
  }
  return { ...out, schemaVersion: version };
}
