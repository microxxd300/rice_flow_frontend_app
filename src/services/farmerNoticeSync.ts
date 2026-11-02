import { apiActivity } from '@/services/apiService';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/constants/api';
import { useAppStore } from '@/store/appStore';
import { noticeIcon } from '@/utils/farmerNotices';

let running = false;

/**
 * Puts the admin's new notices for this farmer into the bell. Only notices newer than
 * the last one seen on this phone are fetched, so each shows once. Failures are quiet:
 * the next app open tries again.
 */
export async function syncFarmerNotices(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const lastId = (await storage.getItem<number>(STORAGE_KEYS.LAST_NOTICE_ID)) ?? 0;
    const { data } = await apiActivity.notices(lastId || undefined);
    const fresh = (Array.isArray(data) ? data : []).filter(n => n.id > lastId);
    if (!fresh.length) return;
    // Oldest first, so the newest ends up on top of the bell
    for (const n of [...fresh].sort((a, b) => a.id - b.id)) {
      // Kept with its kind and params so the bell words it in the language shown at the time
      useAppStore.getState().addNotification({
        title: n.title, body: n.body, icon: noticeIcon(n.kind),
        notice: { kind: n.kind, params: n.params },
      });
    }
    await storage.setItem(STORAGE_KEYS.LAST_NOTICE_ID, Math.max(...fresh.map(n => n.id)));
  } catch {
    // offline or signed out: try again on the next open
  } finally {
    running = false;
  }
}
