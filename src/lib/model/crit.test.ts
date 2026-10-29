import { describe, expect, it } from 'vitest';
import { splitCrit } from './crit';

describe('splitCrit', () => {
  it('reads threat range and multiplier from every form', () => {
    expect(splitCrit('19-20/×2')).toEqual({ critRange: 19, crit: '×2' });
    expect(splitCrit('18-20/×2')).toEqual({ critRange: 18, crit: '×2' });
    expect(splitCrit('20/×3')).toEqual({ critRange: 20, crit: '×3' });
    expect(splitCrit('×4')).toEqual({ critRange: 20, crit: '×4' });
    expect(splitCrit('')).toEqual({ critRange: 20, crit: '×2' });
  });
});
