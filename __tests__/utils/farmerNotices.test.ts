import { noticeMessage, type FarmerNotice } from '@/utils/farmerNotices';
import { translations } from '@/i18n/translations';

const notice = (kind: string, params: FarmerNotice['params'] = {}): FarmerNotice =>
  ({ id: 1, kind, params, title: 'Server title', body: 'Server body', created_at: '2026-11-03T00:00:00Z' });

describe('noticeMessage', () => {
  it('words a removed farm in the farmer language', () => {
    const m = noticeMessage(notice('farm_removed', { farm: 'Pick Test Two' }), translations.en);
    expect(m.title).toBe('Farm removed');
    expect(m.body).toBe('Your farm "Pick Test Two" was removed by the RiceFlow admin.');
    expect(noticeMessage(notice('farm_removed', { farm: 'Pick Test Two' }), translations.ceb).body)
      .toContain('"Pick Test Two"');
  });

  it('names the season in the farmer language', () => {
    const params = { farm: 'Juan farm', season: 'dry', year: 2026 };
    expect(noticeMessage(notice('cycle_removed', params), translations.en).body)
      .toBe('Your crop cycle (Dry Season 2026) on "Juan farm" was removed by the RiceFlow admin.');
    expect(noticeMessage(notice('cycle_removed', params), translations.fil).body).toContain('Tag-Init 2026');
  });

  it('every known kind has text in every language', () => {
    for (const kind of ['farm_removed', 'cycle_removed', 'variety_updated', 'variety_retired']) {
      for (const tr of Object.values(translations)) {
        const m = noticeMessage(notice(kind, { farm: 'F', variety: 'V', season: 'wet', year: 2026 }), tr);
        expect(m.title).toBeTruthy();
        expect(m.body).not.toMatch(/\{\w+\}/);   // every placeholder filled
      }
    }
  });

  it('falls back to the server text for a kind the app does not know yet', () => {
    const m = noticeMessage(notice('something_new'), translations.en);
    expect(m).toEqual({ title: 'Server title', body: 'Server body', icon: 'information-circle-outline' });
  });
});
