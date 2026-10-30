import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { GuideReminder } from '@/utils/guideReminders';

const ID_PREFIX = 'guide-reminder-';
const CHANNEL_ID = 'guide-reminders';

// Show the reminder even when RiceFlow is open at 7 AM. Set on first use, not on
// import, so screens and tests that only import this file need no notification module.
let handlerSet = false;
function setHandlerOnce() {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Runs one sync at a time: two quick guide updates must not schedule duplicates
let queue: Promise<void> = Promise.resolve();

async function cancelAll(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter(n => n.identifier.startsWith(ID_PREFIX))
    .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

async function allowed(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Replace the phone's planting-guide reminders with these. An empty list clears them
 * (notifications switched off, no guide, logged out). Asks for permission only when
 * there is something to remind about; if the farmer says no, nothing is scheduled.
 */
export function syncGuideReminders(
  reminders: GuideReminder[],
  text: { title: string; body: string; channel: string },
): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  queue = queue.then(async () => {
    setHandlerOnce();
    await cancelAll();
    if (reminders.length === 0 || !(await allowed())) return;
    // Own channel, so farmers can mute just these in Android settings. Expo Go can
    // refuse to create it (a NullPointerException inside Expo Go seen on Android 17);
    // then the reminders use the default channel rather than not coming at all.
    let channelId: string | undefined;
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: text.channel,
          importance: AndroidImportance.DEFAULT,
        });
        channelId = CHANNEL_ID;
      } catch (err: any) {
        console.log('[REMINDERS] own channel unavailable, using the default:', err?.message || err);
      }
    }
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: {
          title: text.title,
          body: text.body.replace('{tasks}', r.titles.join(' · ')),
          data: { screen: 'PlantingTab' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId },
      });
    }
  }).catch(err => console.log('[REMINDERS] could not schedule:', err?.message || err));
  return queue;
}

/** Remove every planting-guide reminder, e.g. on logout. */
export function cancelGuideReminders(): Promise<void> {
  return syncGuideReminders([], { title: '', body: '', channel: '' });
}
