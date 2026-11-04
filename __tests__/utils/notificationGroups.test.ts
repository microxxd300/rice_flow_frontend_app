import { notificationGroup, notificationsFor, unreadByTab } from '@/utils/notificationGroups';
import type { AppNotification } from '@/store/appStore';

const n = (id: string, read: boolean, admin = false): AppNotification => ({
  id, title: id, body: '', createdAt: 0, read,
  ...(admin ? { notice: { kind: 'farm_deleted', params: {} } } : {}),
});

describe('notification tabs', () => {
  const list = [n('rain', false), n('guide', true), n('removed', false, true)];

  it('puts the agriculturist notices under Admin and the rest under Farm', () => {
    expect(notificationGroup(list[0])).toBe('farm');
    expect(notificationGroup(list[2])).toBe('admin');
  });

  it('filters by tab', () => {
    expect(notificationsFor(list, 'all')).toHaveLength(3);
    expect(notificationsFor(list, 'farm').map(x => x.id)).toEqual(['rain', 'guide']);
    expect(notificationsFor(list, 'admin').map(x => x.id)).toEqual(['removed']);
  });

  it('counts only unread ones per tab', () => {
    expect(unreadByTab(list)).toEqual({ all: 2, farm: 1, admin: 1 });
  });
});
