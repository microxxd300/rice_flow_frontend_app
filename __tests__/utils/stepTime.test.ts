import {
  FIELD_WORK_END_HOUR,
  FIELD_WORK_START_HOUR,
  STEP_ADVICE_TEXT,
  stepTimeAdvice,
} from '@/utils/stepTime';
import { translations } from '@/i18n/translations';

const step = (key: string, day = 0) => ({ key, daysAfterPlanting: day });
const atHour = (hour: number) => new Date(2026, 10, 6, hour, 0, 0);

describe('stepTimeAdvice', () => {
  it('warns about due outdoor field work at night', () => {
    expect(stepTimeAdvice(step('transplant'), 0, atHour(0)))
      .toEqual({ level: 'caution', code: 'nightWork' });
    expect(stepTimeAdvice(step('harvest'), 0, atHour(FIELD_WORK_END_HOUR)))
      .toEqual({ level: 'caution', code: 'nightWork' });
  });

  it('does not warn during daylight working hours', () => {
    expect(stepTimeAdvice(step('transplant'), 0, atHour(FIELD_WORK_START_HOUR))).toBeNull();
    expect(stepTimeAdvice(step('transplant'), 0, atHour(12))).toBeNull();
  });

  it('does not put a nighttime warning on future or indoor preparation steps', () => {
    expect(stepTimeAdvice(step('transplant', 1), 0, atHour(0))).toBeNull();
    expect(stepTimeAdvice(step('seeds'), 0, atHour(0))).toBeNull();
  });

  it('has nighttime advice in every language', () => {
    const key = STEP_ADVICE_TEXT.nightWork;
    for (const lang of ['en', 'fil', 'ceb'] as const) {
      expect((translations[lang] as any)[key]).toBeTruthy();
    }
  });
});
