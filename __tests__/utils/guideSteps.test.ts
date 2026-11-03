import { guideSteps, guideProgress, guideDay } from '@/utils/guideSteps';

const guide = {
  start_date: '2026-11-01',
  steps: [
    { id: 3, stepNumber: 3, key: 'seedbed', title: 'Sow', daysAfterPlanting: 0, category: 'planting' },
    { id: 1, stepNumber: 1, key: 'seeds', title: 'Seeds', daysAfterPlanting: -10, category: 'planting',
      reference: 'PalayCheck 2022, pp. 14-15', explanation: 'Why' },
    { id: 2, stepNumber: 2, key: 'plow', title: 'Plow', daysAfterPlanting: -7, category: 'planting' },
  ],
};

describe('guideSteps', () => {
  it('orders the steps by their day in the guide', () => {
    expect(guideSteps(guide).map(s => s.key)).toEqual(['seeds', 'plow', 'seedbed']);
    expect(guideSteps(guide)[0]).toMatchObject({ id: '1', reference: 'PalayCheck 2022, pp. 14-15', explanation: 'Why' });
  });

  it('copes with no guide', () => {
    expect(guideSteps(null)).toEqual([]);
  });
});

describe('guideProgress', () => {
  it('the current step is the first one not done, even if a later one was logged first', () => {
    const p = guideProgress(guideSteps(guide), ['2']);
    expect(p.current?.key).toBe('seeds');
    expect(p.next.map(s => s.key)).toEqual(['seedbed']);
    expect([p.done, p.total]).toEqual([1, 3]);
  });

  it('nothing is current once every step is done', () => {
    expect(guideProgress(guideSteps(guide), ['1', '2', '3']).current).toBeNull();
  });
});

describe('guideDay', () => {
  it('counts days from the guide start', () => {
    expect(guideDay(guide, new Date(2026, 10, 4, 15, 0))).toBe(3);
    expect(guideDay({}, new Date())).toBe(0);
  });
});
