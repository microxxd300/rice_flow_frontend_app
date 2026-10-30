/**
 * Which phone reminders the planting guide needs: one per day that has steps not
 * done yet, at REMINDER_HOUR, listing that day's steps. Days count from the guide's
 * start date (day 0), the same way Home's "Upcoming Tasks" counts them, so a reminder
 * and the Home task always agree. Pure, so it can be tested without a phone.
 */
export const REMINDER_HOUR = 7;
// Phones cap scheduled notifications (iOS keeps 64); the list is rebuilt as days pass
export const MAX_REMINDER_DAYS = 20;

export interface GuideReminder {
  id: string;        // stable per day, so rescheduling replaces instead of duplicating
  date: Date;        // when it fires
  titles: string[];  // the steps due that day
}

export function planGuideReminders(guide: any, completedIds: string[], now: Date = new Date()): GuideReminder[] {
  if (!guide || !Array.isArray(guide.steps) || guide.steps.length === 0) return [];
  const startStr = guide.startDate || guide.start_date;
  const start = startStr ? new Date(startStr) : new Date(now);
  start.setHours(0, 0, 0, 0);

  const done = new Set(completedIds.map(String));
  const seen = new Set<string>();
  const byDay = new Map<number, string[]>();
  for (const st of guide.steps) {
    const id = String(st.id);
    if (seen.has(id) || done.has(id) || st.is_completed) continue;
    seen.add(id);
    const day = Number(st.daysAfterPlanting ?? 0) || 0;
    const title = String(st.title ?? '').trim();
    if (title) byDay.set(day, [...(byDay.get(day) ?? []), title]);
  }

  return [...byDay.entries()]
    .map(([day, titles]) => {
      const date = new Date(start);
      date.setDate(date.getDate() + day);
      date.setHours(REMINDER_HOUR, 0, 0, 0);
      const ymd = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      return { id: `guide-reminder-${ymd}`, date, titles };
    })
    .filter(r => r.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_REMINDER_DAYS);
}
