import { planGuideReminders, REMINDER_HOUR, MAX_REMINDER_DAYS } from '@/utils/guideReminders';

// Guide started (day 0) on 30 Oct 2026; "now" is 30 Oct at 9:00 AM
const NOW = new Date(2026, 9, 30, 9, 0, 0);
const guide = (steps: any[]) => ({ start_date: '2026-10-30', steps });
const step = (id: number, day: number, title: string, extra = {}) =>
  ({ id, daysAfterPlanting: day, title, ...extra });

describe('planGuideReminders', () => {
  it('reminds at 7 AM on the day a step is due, counting from the guide start', () => {
    const [r] = planGuideReminders(guide([step(1, 14, 'First fertilizer')]), [], NOW);
    expect(r.date).toEqual(new Date(2026, 10, 13, REMINDER_HOUR, 0, 0));
    expect(r.titles).toEqual(['First fertilizer']);
  });

  it('puts all steps of one day in one reminder', () => {
    const plan = planGuideReminders(guide([step(1, 3, 'Soak seeds'), step(2, 3, 'Prepare seedbed')]), [], NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0].titles).toEqual(['Soak seeds', 'Prepare seedbed']);
  });

  it('skips steps already done and days already past', () => {
    const plan = planGuideReminders(guide([
      step(1, 0, 'Sowing'),                              // today 7 AM, already past at 9 AM
      step(2, 5, 'Ticked in the app'),
      step(3, 6, 'Done on the server', { is_completed: true }),
      step(4, 7, 'Irrigate'),
    ]), ['2'], NOW);
    expect(plan.map(r => r.titles[0])).toEqual(['Irrigate']);
  });

  it('keeps the same id for a day, so rescheduling replaces instead of duplicating', () => {
    const a = planGuideReminders(guide([step(1, 4, 'Harrow')]), [], NOW);
    const b = planGuideReminders(guide([step(1, 4, 'Harrow'), step(2, 4, 'Level')]), [], NOW);
    expect(a[0].id).toBe(b[0].id);
  });

  it('schedules only the next days, within what phones allow', () => {
    const many = Array.from({ length: 40 }, (_, i) => step(i, i + 1, `Task ${i}`));
    const plan = planGuideReminders(guide(many), [], NOW);
    expect(plan).toHaveLength(MAX_REMINDER_DAYS);
    expect(plan[0].titles).toEqual(['Task 0']);
  });

  it('plans nothing without a guide', () => {
    expect(planGuideReminders(null, [], NOW)).toEqual([]);
    expect(planGuideReminders(guide([]), [], NOW)).toEqual([]);
  });
});
