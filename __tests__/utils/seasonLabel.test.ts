import { seasonInLanguage, seasonLabel } from '@/utils/formatting';

describe('seasonLabel', () => {
  it('names the season from the sowing day, like the planting guide', () => {
    expect(seasonLabel({ season: 'dry', year: 2026, planting_date: '2026-11-19' })).toBe('Dry 2026-27');
    expect(seasonLabel({ season: 'dry', year: 2027, planting_date: '2027-02-10' })).toBe('Dry 2026-27');
    expect(seasonLabel({ season: 'wet', year: 2026, planting_date: '2026-06-01' })).toBe('Wet 2026');
  });

  it('falls back on the cycle when there is no sowing day', () => {
    expect(seasonLabel({ season: 'wet', year: 2026 })).toBe('Wet 2026');
    expect(seasonLabel(null)).toBe('');
  });

  it('puts the season name in the app language', () => {
    expect(seasonInLanguage('Dry Season 2026-27', { recCondDry: 'Tinginit', recCondWet: 'Tingulan' })).toBe('Tinginit 2026-27');
  });
});
