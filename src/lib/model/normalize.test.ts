import { describe, expect, it } from 'vitest';
import { normalize } from './normalize';

describe('normalize', () => {
  it('fills defaults for partial data', () => {
    const c = normalize({ info: { name: 'Valeros' }, weapons: [{ name: 'Longsword' }] });
    expect(c.info.name).toBe('Valeros');
    expect(c.info.size).toBe('medium');
    expect(c.abilities.str.base).toBe(10);
    expect(c.weapons[0].name).toBe('Longsword');
    expect(c.weapons[0].crit).toBe('20/×2');
    expect(c.weapons[0].id).toBeTruthy();
  });

  it('rejects wrong primitive types and keeps open maps', () => {
    const c = normalize({
      heroPoints: 'lots',
      ui: { sections: { skills: { hidden: true } } },
    });
    expect(c.heroPoints).toBe(1);
    expect(c.ui.sections.skills.hidden).toBe(true);
  });

  it('treats garbage as a blank character', () => {
    expect(normalize(null).skills.length).toBeGreaterThan(20);
  });
});
