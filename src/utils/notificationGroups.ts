import type { AppNotification } from '@/store/appStore';

/**
 * The bell's tabs: Farm is what the app tells the farmer (weather, the guide, logs, scans);
 * Admin is what their agriculturist changed (notices synced from the server).
 */
export type NotificationTab = 'all' | 'farm' | 'admin';

export const notificationGroup = (n: AppNotification): Exclude<NotificationTab, 'all'> =>
  n.notice ? 'admin' : 'farm';

export function notificationsFor(list: AppNotification[], tab: NotificationTab): AppNotification[] {
  return tab === 'all' ? list : list.filter(n => notificationGroup(n) === tab);
}

/** Unread count per tab, for the tab labels. */
export function unreadByTab(list: AppNotification[]): Record<NotificationTab, number> {
  const out = { all: 0, farm: 0, admin: 0 };
  for (const n of list) {
    if (n.read) continue;
    out.all++;
    out[notificationGroup(n)]++;
  }
  return out;
}
