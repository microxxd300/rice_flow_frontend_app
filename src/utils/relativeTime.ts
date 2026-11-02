import type { Translations } from '@/i18n/translations';

/** "Just now", "5 min ago", "Yesterday", "3 days ago" in the farmer's language, then the date. */
export function relTime(ms: number, tr: Translations, now = Date.now()): string {
  const m = Math.floor((now - ms) / 60000);
  if (m < 1)  return tr.timeJustNow;
  if (m < 60) return tr.timeMinutesAgo.replace('{n}', String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return tr.timeHoursAgo.replace('{n}', String(h));
  const d = Math.floor(h / 24);
  if (d === 1) return tr.timeYesterday;
  if (d < 7)   return tr.timeDaysAgo.replace('{n}', String(d));
  return new Date(ms).toLocaleDateString();
}
