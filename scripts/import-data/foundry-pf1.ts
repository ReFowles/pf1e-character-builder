// Convert the Foundry VTT PF1 system's compendium packs (OGL 1.0a game
// content) into compact JSON for the app. Run against an extracted copy:
//
//   curl -L -o packs.tar.gz "https://gitlab.com/api/v4/projects/foundryvtt_pathfinder1e%2Ffoundryvtt-pathfinder1/repository/archive.tar.gz?sha=master&path=packs"
//   tar xzf packs.tar.gz
//   node scripts/import-data/foundry-pf1.ts <extracted-dir>/packs
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { DbFeat, DbItem, DbSpell } from '../../src/lib/db/types.ts';

const root = process.argv[2];
if (!root) throw new Error('usage: node scripts/import-data/foundry-pf1.ts <packs-dir>');
const out = 'public/data';
mkdirSync(out, { recursive: true });

type Doc = { name: string; type: string; system: Record<string, any> };

function* walk(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (f.endsWith('.yaml') && !f.startsWith('_')) yield p;
  }
}

function load(pack: string): Doc[] {
  const docs: Doc[] = [];
  for (const file of walk(join(root, pack))) {
    const d = parse(readFileSync(file, 'utf8')) as Doc;
    if (d?.name && d.system) docs.push(d);
  }
  return docs;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', times: '×', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', frac12: '½' };

/** HTML to plain text, keeping paragraph breaks. Foundry inline rolls become their label. */
function text(html: unknown, max = 1500): string {
  if (typeof html !== 'string') return '';
  let s = html
    .replace(/\[\[[^\]]*?\[([^\]]+)\]\]\]/g, '$1')
    .replace(/@\w+\[[^\]]*\]\{([^}]*)\}/g, '$1')
    .replace(/@\w+\[([^\]]*)\]/g, '$1')
    .replace(/<\/?(p|li|h\d|tr|div)(\s[^>]*)?>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|\w+);/g, (m, e) => (e[0] === '#' ? String.fromCharCode(Number(e.slice(1))) : (ENTITIES[e] ?? m)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return s;
}

const source = (sys: Record<string, any>) => (sys.sources ?? []).map((x: any) => x.id + (x.pages ? ` p${x.pages}` : '')).join(', ');
const firstAction = (sys: Record<string, any>) => Object.values(sys.actions ?? {})[0] as Record<string, any> | undefined;

const RANGE: Record<string, string> = { close: 'close', medium: 'medium', long: 'long', touch: 'touch', personal: 'personal', melee: 'melee', reach: 'reach', unlimited: 'unlimited', seeText: 'see text' };
function range(r: any): string {
  if (!r?.units) return '';
  if (RANGE[r.units]) return RANGE[r.units];
  return [r.value, r.units].filter(Boolean).join(' ');
}

const DURATION: Record<string, string> = { inst: 'instantaneous', perm: 'permanent', spec: 'see text', seeText: 'see text', turn: 'turn', round: 'round', minute: 'minute', hour: 'hour', day: 'day', month: 'month', year: 'year' };
function duration(d: any): string {
  if (!d?.units) return '';
  const unit = DURATION[d.units] ?? d.units;
  const v = String(d.value ?? '').trim();
  if (!v) return unit;
  // Free-text durations ("concentration, up to 1 round/level") are stored with a "see text" unit.
  if (d.units === 'spec' || d.units === 'seeText') return v;
  const perLevel = v.replace(/@cl/g, 'level').replace(/\s+/g, ' ');
  if (perLevel === 'level') return `1 ${unit}/level`;
  const scaled = perLevel.match(/^(\d+)\s*\*\s*level$/);
  if (scaled) return `${scaled[1]} ${unit}s/level`;
  if (/level/.test(perLevel)) return `${perLevel} ${unit}s`;
  return `${v} ${unit}${v === '1' ? '' : 's'}`;
}

const SCHOOLS: Record<string, string> = { abj: 'abjuration', con: 'conjuration', div: 'divination', enc: 'enchantment', evo: 'evocation', ill: 'illusion', nec: 'necromancy', trs: 'transmutation', uni: 'universal' };

// --- Spells ------------------------------------------------------------------
const spells: DbSpell[] = load('spells').map((d) => {
  const s = d.system;
  const a = firstAction(s) ?? {};
  const comp = s.components ?? {};
  const components = [comp.verbal && 'V', comp.somatic && 'S', comp.material && 'M', comp.focus && 'F', comp.divineFocus && 'DF'].filter(Boolean).join(', ');
  return {
    name: d.name,
    school: SCHOOLS[s.school] ?? s.school ?? '',
    levels: { ...(s.learnedAt?.class ?? {}) },
    components,
    castingTime: [a.activation?.cost, a.activation?.type].filter(Boolean).join(' '),
    range: range(a.range),
    target: a.target?.value ?? a.effect ?? a.area ?? '',
    duration: duration(a.duration),
    save: a.save?.description ?? (a.save?.type ? `${a.save.type} negates` : 'none'),
    // Foundry stores `sr` only when false; spells allow SR by default.
    sr: s.sr === false ? 'no' : 'yes',
    summary: text(s.description?.summary, 200),
    description: text(s.description?.value),
    source: source(s),
  };
});

// --- Feats -------------------------------------------------------------------
const feats: DbFeat[] = load('feats')
  .filter((d) => d.system.subType === 'feat' || !d.system.subType)
  .map((d) => ({
    name: d.name,
    tags: d.system.tags ?? [],
    summary: text(d.system.description?.summary, 200),
    description: text(d.system.description?.value),
    source: source(d.system),
  }));

// --- Items, weapons, armor ---------------------------------------------------
function price(p: any): string {
  if (!p?.base) return '';
  return `${p.base} ${p.unit ?? 'gp'}`;
}

const HAND: Record<string, string> = { light: 'light', '1h': 'one-handed', '2h': 'two-handed', ranged: 'ranged' };
const ARMOR_CAT: Record<string, string> = { lightArmor: 'light', mediumArmor: 'medium', heavyArmor: 'heavy', lightShield: 'light shield', heavyShield: 'heavy shield', towerShield: 'tower', buckler: 'buckler', other: '' };

function item(d: Doc): DbItem | null {
  const s = d.system;
  const base: DbItem = {
    name: d.name,
    category: d.type === 'loot' ? (s.subType ?? 'gear') : d.type,
    slot: s.slot && s.slot !== 'slotless' ? s.slot : s.slot === 'slotless' ? 'slotless' : '',
    weight: Number(s.weight?.value ?? 0) || 0,
    price: price(s.price),
    summary: text(s.description?.summary, 200),
    description: text(s.description?.value ?? s.description?.unidentified, 800),
    source: source(s),
  };
  if (d.type === 'weapon') {
    const a = firstAction(s) ?? {};
    base.weapon = {
      damage: String(a.damage?.parts?.[0]?.formula ?? '').replace(/sizeRoll\((\d+),\s*(\d+).*\)/, '$1d$2'),
      crit: `${a.ability?.critRange && a.ability.critRange < 20 ? `${a.ability.critRange}-20/` : ''}×${a.ability?.critMult ?? 2}`,
      range: Number(a.range?.value) > 0 ? `${a.range.value} ft` : '',
      type: (a.damage?.parts?.[0]?.types ?? []).map((t: string) => t[0].toUpperCase()).join('/'),
      handedness: HAND[s.weaponSubtype] ?? s.weaponSubtype ?? '',
      proficiency: s.subType ?? '',
    };
  }
  if (d.type === 'equipment' && (s.subType === 'armor' || s.subType === 'shield')) {
    const isShield = s.subType === 'shield';
    base.category = isShield ? 'shield' : 'armor';
    base.armor = {
      kind: isShield ? 'shield' : 'armor',
      ac: Number(s.armor.value ?? 0),
      maxDex: s.armor.dex === null || s.armor.dex === undefined || s.armor.dex === '' ? null : Number(s.armor.dex),
      acp: -Math.abs(Number(s.armor.acp ?? 0)),
      asf: Number(s.spellFailure ?? 0),
      category: ARMOR_CAT[s.equipmentSubtype] ?? '',
    };
  } else if (d.type === 'equipment') {
    base.category = 'magic';
  }
  return base;
}

const items: DbItem[] = ['items', 'ultimate-equipment', 'weapons-and-ammo', 'armors-and-shields']
  .flatMap(load)
  .map(item)
  .filter((x): x is DbItem => !!x);

const byName = <T extends { name: string }>(a: T[]) => {
  const seen = new Set<string>();
  return a
    .sort((x, y) => x.name.localeCompare(y.name))
    .filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true)));
};

for (const [name, data] of Object.entries({ spells: byName(spells), feats: byName(feats), items: byName(items) })) {
  writeFileSync(join(out, `${name}.json`), JSON.stringify(data));
  console.log(`${name}: ${data.length} entries, ${(JSON.stringify(data).length / 1024).toFixed(0)} KiB`);
}
// The OGL requires shipping the license and the copyright notices with the content.
writeFileSync(join(out, 'OGL.txt'), readFileSync(join(root, '..', 'OGL.txt'), 'utf8'));
