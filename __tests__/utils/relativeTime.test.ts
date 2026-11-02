import { relTime } from '@/utils/relativeTime';
import { translations } from '@/i18n/translations';

const NOW = new Date(2026, 10, 3, 12, 0).getTime();
const ago = (minutes: number) => NOW - minutes * 60000;

describe('relTime', () => {
  it('reads in the farmer language', () => {
    expect(relTime(ago(0), translations.en, NOW)).toBe('Just now');
    expect(relTime(ago(5), translations.fil, NOW)).toBe('5 minuto na');
    expect(relTime(ago(3 * 60), translations.ceb, NOW)).toBe('3 ka oras na');
    expect(relTime(ago(24 * 60), translations.en, NOW)).toBe('Yesterday');
    expect(relTime(ago(3 * 24 * 60), translations.ceb, NOW)).toBe('3 ka adlaw na');
  });

  it('every language has the bell text', () => {
    for (const tr of Object.values(translations)) {
      for (const key of ['notifTitle', 'notifMarkAll', 'notifEmpty', 'timeJustNow', 'timeYesterday'] as const) {
        expect(tr[key]).toBeTruthy();
      }
      for (const key of ['timeMinutesAgo', 'timeHoursAgo', 'timeDaysAgo'] as const) {
        expect(tr[key]).toContain('{n}');
      }
    }
  });
});
