import type { Translations } from '@/i18n/translations';

/** A notice from GET /api/activity/notices/: something the admin changed that affects this farmer. */
export interface FarmerNotice {
  id:         number;
  kind:       string;                              // farm_removed, cycle_removed, variety_updated, variety_retired
  params:     Record<string, string | number>;
  title:      string;                              // English text from the server, used for unknown kinds
  body:       string;
  created_at: string;
}

const ICONS: Record<string, string> = {
  farm_removed:    'trash-outline',
  cycle_removed:   'trash-outline',
  variety_updated: 'leaf-outline',
  variety_retired: 'alert-circle-outline',
};

export const noticeIcon = (kind: string) => ICONS[kind] ?? 'information-circle-outline';

const fill = (text: string, params: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? '').toString());

/** The bell text for a notice in the farmer's current language; the server's English text
    covers kinds this version of the app does not know. */
export function noticeMessage(
  n: Pick<FarmerNotice, 'kind' | 'params' | 'title' | 'body'>, tr: Translations,
): { title: string; body: string; icon: string } {
  const p = { ...n.params };
  if (n.kind === 'cycle_removed') p.season = p.season === 'dry' ? tr.recCondDry : tr.recCondWet;
  const keys: Record<string, [keyof Translations, keyof Translations]> = {
    farm_removed:    ['noticeFarmRemovedTitle', 'noticeFarmRemovedBody'],
    cycle_removed:   ['noticeCycleRemovedTitle', 'noticeCycleRemovedBody'],
    variety_updated: ['noticeVarietyUpdatedTitle', 'noticeVarietyUpdatedBody'],
    variety_retired: ['noticeVarietyRetiredTitle', 'noticeVarietyRetiredBody'],
  };
  const pair = keys[n.kind];
  return {
    title: pair ? fill(tr[pair[0]], p) : n.title,
    body:  pair ? fill(tr[pair[1]], p) : n.body,
    icon:  noticeIcon(n.kind),
  };
}
