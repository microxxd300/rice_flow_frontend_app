import { rainfedWaitAdvice } from '@/utils/seasonAdvice';

const guide = (start: string) => ({ start_date: start });
const beforeSowing = { daysAfterPlanting: -7 };

describe('rainfedWaitAdvice', () => {
  it('tells a rainfed farm sowing in the drier months to wait for steady rain', () => {
    expect(rainfedWaitAdvice('rainfed_lowland', guide('2026-12-10'), beforeSowing)).toBe(true);
    expect(rainfedWaitAdvice('rainfed_lowland', guide('2027-03-05'), { daysAfterPlanting: 0 })).toBe(true);
  });

  it('says nothing in the rainy months', () => {
    expect(rainfedWaitAdvice('rainfed_lowland', guide('2026-06-15'), beforeSowing)).toBe(false);
  });

  it('is only for rainfed farms, and only before sowing', () => {
    expect(rainfedWaitAdvice('irrigated_lowland', guide('2027-01-10'), beforeSowing)).toBe(false);
    expect(rainfedWaitAdvice('upland', guide('2027-01-10'), beforeSowing)).toBe(false);
    expect(rainfedWaitAdvice('rainfed_lowland', guide('2027-01-10'), { daysAfterPlanting: 21 })).toBe(false);
  });

  it('copes with no guide or step', () => {
    expect(rainfedWaitAdvice('rainfed_lowland', null, beforeSowing)).toBe(false);
    expect(rainfedWaitAdvice('rainfed_lowland', guide('2027-01-10'), null)).toBe(false);
  });
});
