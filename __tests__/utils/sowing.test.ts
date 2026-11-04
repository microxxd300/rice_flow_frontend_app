import { daysAgoISO, sowingQuestionDue, sowingStep } from '@/utils/sowing';

const guide = {
  start_date: '2026-11-14',           // the planned sowing day
  steps: [
    { id: 1, key: 'seeds',   title: 'Seeds', daysAfterPlanting: -10 },
    { id: 2, key: 'seedbed', title: 'Sow',   daysAfterPlanting: 0 },
    { id: 3, key: 'transplant', title: 'Transplant', daysAfterPlanting: 21 },
  ],
};

describe('sowingQuestionDue', () => {
  it('asks from the planned sowing day on', () => {
    expect(sowingQuestionDue(guide, [], new Date(2026, 10, 13, 9))).toBe(false);   // the day before
    expect(sowingQuestionDue(guide, [], new Date(2026, 10, 14, 9))).toBe(true);
    expect(sowingQuestionDue(guide, ['1'], new Date(2026, 10, 20, 9))).toBe(true); // still not sown
  });

  it('stops once sowing is logged', () => {
    expect(sowingQuestionDue(guide, ['2'], new Date(2026, 10, 20, 9))).toBe(false);
  });

  it('needs a guide with a sowing step', () => {
    expect(sowingQuestionDue(null, [], new Date())).toBe(false);
    expect(sowingQuestionDue({ ...guide, steps: [guide.steps[0]] }, [], new Date(2026, 10, 20))).toBe(false);
    expect(sowingStep(guide)?.id).toBe('2');
  });
});

describe('daysAgoISO', () => {
  it('counts back in the phone time', () => {
    expect(daysAgoISO(0, new Date(2026, 10, 14, 23, 30))).toBe('2026-11-14');
    expect(daysAgoISO(3, new Date(2026, 11, 2, 8))).toBe('2026-11-29');
  });
});
