import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '@/store/appStore';
import { useTranslation } from '@/i18n/useTranslation';
import { planGuideReminders } from '@/utils/guideReminders';
import { syncGuideReminders } from '@/services/guideReminderScheduler';
import { useStepWeather } from '@/hooks/useFarmForecast';
import { guideSteps } from '@/utils/guideSteps';
import { ADVICE_TEXT } from '@/utils/stepWeather';
import { sowingStep } from '@/utils/sowing';
import { cropIsOver } from '@/utils/nextCrop';

/**
 * Keeps the phone's 7 AM planting-guide reminders in step with the guide: rebuilt when
 * the guide changes, a step is logged, the language changes, notifications are
 * switched off in Profile, or the weather advice for a coming step changes (a reminder
 * then says, for example, to hold the fertilizer because heavy rain is coming).
 */
export function useGuideReminders(): void {
  const guide     = useAppStore(s => s.latestGuide);
  const completed = useAppStore(s => s.completedGuideSteps);
  const enabled   = useAppStore(s => s.notificationsEnabled);
  const cropOver  = cropIsOver(useAppStore(s => s.activeCycle));
  const tr        = useTranslation();
  const { adviceFor } = useStepWeather();

  const byId = new Map(guideSteps(guide).map(st => [st.id, st]));
  const sowId = sowingStep(guide)?.id;
  const reminders = (enabled && !cropOver ? planGuideReminders(guide, completed) : []).map(r => {
    const notes: string[] = [];
    // The sowing day's reminder asks "Did you sow already?", so the plan follows the real day
    if (sowId && r.stepIds.includes(sowId)) notes.push(tr.sowAskReminder);
    const advice = r.stepIds.map(id => adviceFor(byId.get(id))).find(a => !!a);
    if (advice) notes.push((tr as any)[ADVICE_TEXT[advice.code]] as string);
    return notes.length ? { ...r, note: notes.join('\n') } : r;
  });
  // As text, so a new forecast every 10 minutes reschedules nothing unless a note changed
  const plan = JSON.stringify(reminders);

  useEffect(() => {
    const planned = (JSON.parse(plan) as any[]).map(r => ({ ...r, date: new Date(r.date) }));
    void syncGuideReminders(planned, {
      title: tr.reminderTitle, body: tr.reminderBody, channel: tr.reminderChannel,
    });
  }, [plan, tr]);
}

/** Calls open() once for each reminder the farmer taps, including the one that launched the app. */
export function useReminderTap(open: () => void): void {
  const response = Notifications.useLastNotificationResponse();
  const handled  = useRef<string | null>(null);
  useEffect(() => {
    if (!response || response.notification.request.content.data?.screen !== 'PlantingTab') return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handled.current === key) return;
    handled.current = key;
    open();
  }, [response, open]);
}
