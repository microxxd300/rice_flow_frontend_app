import { loadGuide, guideNeedsTranslation } from '@/services/guideLoader';
import { apiGuides } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';

jest.mock('@/services/apiService', () => ({ apiGuides: { generate: jest.fn() } }));
const generate = apiGuides.generate as jest.Mock;

const guide = (language: string, source = 'GEMINI') =>
  ({ id: 7, language, source, steps: [{ id: 1, is_completed: false }] });

describe('loadGuide', () => {
  beforeEach(() => {
    generate.mockReset();
    useAppStore.setState({ latestGuide: null, completedGuideSteps: [] });
  });

  it('shares one request when Profile and the Planting screen ask at the same time', async () => {
    let finish: (v: any) => void = () => {};
    generate.mockReturnValue(new Promise(r => { finish = r; }));
    const fromProfile = loadGuide(12, 'ceb');
    const fromPlanting = loadGuide(12, 'ceb');
    finish({ data: guide('ceb') });
    await Promise.all([fromProfile, fromPlanting]);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().latestGuide.language).toBe('ceb');
  });

  it('asks again once the first request has finished', async () => {
    generate.mockResolvedValue({ data: guide('ceb', 'SAVED') });
    await loadGuide(12, 'ceb');
    await loadGuide(12, 'ceb');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('needs a translation only when a guide in another language is on the phone', () => {
    expect(guideNeedsTranslation('ceb')).toBe(false);          // no guide yet
    useAppStore.setState({ latestGuide: guide('fil') });
    expect(guideNeedsTranslation('ceb')).toBe(true);
    expect(guideNeedsTranslation('fil')).toBe(false);
  });
});
