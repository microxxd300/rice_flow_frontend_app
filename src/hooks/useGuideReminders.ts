import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '@/store/appStore';
import { useTranslation } from '@/i18n/useTranslation';
import { planGuideReminders } from '@/utils/guideReminders';
import { syncGuideReminders } from '@/services/guideReminderScheduler';

/**
 * Keeps the phone's 7 AM planting-guide reminders in step with the guide: rebuilt when
 * the guide changes, a step is ticked, the language changes or notifications are
 * switched off in Profile.
 */
export function useGuideReminders(): void {
  const guide     = useAppStore(s => s.latestGuide);
  const completed = useAppStore(s => s.completedGuideSteps);
  const enabled   = useAppStore(s => s.notificationsEnabled);
  const tr        = useTranslation();

  useEffect(() => {
    const reminders = enabled ? planGuideReminders(guide, completed) : [];
    void syncGuideReminders(reminders, {
      title: tr.reminderTitle, body: tr.reminderBody, channel: tr.reminderChannel,
    });
  }, [guide, completed, enabled, tr]);
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
