import { describe, expect, it } from 'vitest';
import { parseFcbNote, parseGp } from './migrate';
import { normalize } from './normalize';

describe('migrate v1 -> v2', () => {
  const v1 = {
    schemaVersion: 1,
    speeds: { base: 30, armored: 20, fly: 60, flyManeuverability: 'good', swim: 0, climb: 20, burrow: 0 },
    classes: [{ id: 'c', classSkills: ['knowledge:religion'] }],
    levels: [
      { id: 'a', classId: 'c', fcb: { kind: 'hp', note: '' } },
      { id: 'b', classId: 'c', fcb: { kind: 'other', note: '+ 1/3 Damage to Channel' } },
    ],
    items: [{ id: 'i', name: 'Rope', value: '10 sp' }],
    skills: [
      { id: 's1', skill: 'knowledge', subtype: 'arcana', ranks: 0 },
      { id: 's2', skill: 'knowledge', subtype: 'religion', ranks: 0 },
      { id: 's3', skill: 'knowledge', subtype: 'local', ranks: 2 },
      { id: 's4', skill: 'stealth', ranks: 0 },
    ],
  };

  it('converts speeds, fcbs, prices and prunes unused knowledges', () => {
    const c = normalize(v1);
    expect(c.schemaVersion).toBe(2);
    expect(c.speeds.other.map((s) => [s.mode, s.value, s.maneuverability])).toEqual([
      ['fly', 60, 'good'],
      ['climb', 20, ''],
    ]);
    expect(c.levels[1].fcb).toEqual({ kind: 'other', amount: '1/3', label: 'Damage to Channel' });
    expect(c.items[0].price).toBe(1);
    expect(c.skills.map((s) => s.subtype ?? s.skill)).toEqual(['religion', 'local', 'stealth']);
  });

  it('parses prices and notes', () => {
    expect(parseGp('1,200 gp')).toBe(1200);
    expect(parseGp('3 pp')).toBe(30);
    expect(parseGp('')).toBe(0);
    expect(parseFcbNote('+1 rage power')).toEqual({ amount: '1', label: 'rage power' });
    expect(parseFcbNote('extra spell known')).toEqual({ amount: '1', label: 'extra spell known' });
  });
});
