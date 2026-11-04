import { cropDays } from '@/utils/cropDays';

describe('cropDays', () => {
  const today = new Date(2026, 10, 4);   // Nov 4, 2026, phone time

  it('counts the sowing day as day 1', () => {
    expect(cropDays('2026-11-04', '2027-02-22', today)?.day).toBe(1);
    expect(cropDays('2026-11-01', '2027-02-22', today)?.day).toBe(4);
  });

  it('gives the season length and the share gone', () => {
    const d = cropDays('2026-11-01', '2027-02-22', today)!;
    expect(d.total).toBe(113);
    expect(d.share).toBeCloseTo(4 / 113);
  });

  it('is 0 or less before sowing', () => {
    expect(cropDays('2026-11-10', '2027-03-01', today)?.day).toBe(-5);
    expect(cropDays('2026-11-10', '2027-03-01', today)?.share).toBe(0);
  });

  it('has no total without a harvest date, and nothing without a sowing date', () => {
    expect(cropDays('2026-11-01', null, today)?.total).toBeNull();
    expect(cropDays(null, '2027-02-22', today)).toBeNull();
  });

  it('stops the bar at full after the expected harvest', () => {
    expect(cropDays('2026-07-01', '2026-10-20', today)?.share).toBe(1);
  });
});
