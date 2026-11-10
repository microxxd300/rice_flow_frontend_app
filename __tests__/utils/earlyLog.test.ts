import { EARLY_WINDOWS, earlyLogCheck, earlyWindow } from '@/utils/earlyLog';

// Sown on Nov 14 (the sowing step, id 2, is logged)
const guide = {
  start_date: '2026-11-14',
  steps: [
    { id: 1, key: 'rf_seeds',   daysAfterPlanting: -10 },
    { id: 2, key: 'rf_sow',     daysAfterPlanting: 0 },
    { id: 3, key: 'rf_top',     daysAfterPlanting: 25 },    // planned Dec 9
    { id: 4, key: 'rf_pests',   daysAfterPlanting: 35 },    // planned Dec 19
    { id: 5, key: 'rf_harvest', daysAfterPlanting: 112 },   // planned Mar 6
  ],
};
const sown = ['1', '2'];
const step = (i: number) => ({ key: guide.steps[i].key, daysAfterPlanting: guide.steps[i].daysAfterPlanting });

describe('earlyLogCheck', () => {
  it('logs fertilizer up to 3 days early, asks up to 7, refuses earlier', () => {
    expect(earlyLogCheck(guide, step(2), sown, '2026-12-09').level).toBe('ok');   // on the day
    expect(earlyLogCheck(guide, step(2), sown, '2026-12-06').level).toBe('ok');   // 3 days early
    expect(earlyLogCheck(guide, step(2), sown, '2026-12-05').level).toBe('ask');  // 4 days early
    expect(earlyLogCheck(guide, step(2), sown, '2026-12-02').level).toBe('ask');  // 7 days early
    const tooEarly = earlyLogCheck(guide, step(2), sown, '2026-12-01');           // 8 days early
    expect(tooEarly).toEqual({ level: 'block', planned: '2026-12-09', earliest: '2026-12-02', days: 8 });
  });

  it('gives field checks more room than fertilizer', () => {
    expect(earlyLogCheck(guide, step(3), sown, '2026-12-12').level).toBe('ok');   // 7 days early
    expect(earlyLogCheck(guide, step(3), sown, '2026-11-28').level).toBe('ask');  // 21 days early
    expect(earlyLogCheck(guide, step(3), sown, '2026-11-27').level).toBe('block');
  });

  it('refuses a harvest more than 2 weeks before the expected harvest', () => {
    expect(earlyLogCheck(guide, step(4), sown, '2027-02-20').level).toBe('ask');  // 14 days early
    expect(earlyLogCheck(guide, step(4), sown, '2027-02-19').level).toBe('block');
    expect(earlyLogCheck(guide, step(4), sown, '2026-11-20').level).toBe('block'); // a week after sowing
  });

  it('never limits late logs, work before sowing, or sowing itself', () => {
    expect(earlyLogCheck(guide, step(2), sown, '2027-01-30').level).toBe('ok');   // late
    expect(earlyLogCheck(guide, step(0), sown, '2026-01-01').level).toBe('ok');
    expect(earlyLogCheck(guide, step(1), sown, '2026-01-01').level).toBe('ok');
  });

  it('does not judge dates before the sowing is logged', () => {
    expect(earlyLogCheck(guide, step(4), ['1'], '2026-11-20').level).toBe('ok');
    expect(earlyLogCheck(null, step(4), sown, '2026-11-20').level).toBe('ok');
  });
});

describe('earlyWindow', () => {
  it('times each kind of work on its own, and treats unknown steps as checks', () => {
    expect(earlyWindow('fertilizer1')).toBe(EARLY_WINDOWS.fertilizer);
    expect(earlyWindow('up_weed2')).toBe(EARLY_WINDOWS.weeding);
    expect(earlyWindow('rf_drain')).toBe(EARLY_WINDOWS.drain);
    expect(earlyWindow('drystore')).toBe(EARLY_WINDOWS.harvest);
    expect(earlyWindow('lcc')).toBe(EARLY_WINDOWS.check);
    expect(earlyWindow('something_new')).toBe(EARLY_WINDOWS.check);
  });
});
