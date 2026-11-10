import { suitabilityCode, suitabilityLegend, suitabilityName, suitabilityText } from '@/utils/suitability';

describe('suitabilityText', () => {
  it('puts the name first and the code after', () => {
    expect(suitabilityText('S1 - Highly Suitable')).toBe('Highly Suitable [S1]');
    expect(suitabilityText('S2 - Moderately Suitable')).toBe('Moderately Suitable [S2]');
    expect(suitabilityText('S3 - Marginally Suitable')).toBe('Marginally Suitable [S3]');
    expect(suitabilityText('N1 - Currently Not Suitable')).toBe('Currently Not Suitable [N1]');
    expect(suitabilityText('N2 - Not Suitable')).toBe('Not Suitable [N2]');
  });

  it('reads an older result that only has the code', () => {
    expect(suitabilityText('S1')).toBe('Highly Suitable [S1]');
    expect(suitabilityCode('s2')).toBe('S2');
  });

  it('copes with no class', () => {
    expect(suitabilityText(undefined)).toBe('—');
    expect(suitabilityCode('')).toBe('');
  });
});

describe('suitabilityLegend', () => {
  it('names each code in the table once, best class first', () => {
    expect(suitabilityLegend(['S2 - Moderately Suitable', 'S1 - Highly Suitable', 'S1']))
      .toBe('S1 = Highly Suitable · S2 = Moderately Suitable');
    expect(suitabilityLegend([undefined, ''])).toBe('');
    expect(suitabilityName('N1')).toBe('Currently Not Suitable');
  });
});
