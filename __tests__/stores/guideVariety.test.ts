import { useAppStore, guideVarietyId } from '@/store/appStore';

jest.mock('@/services/storage', () => ({
  storage: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) },
}));

const rec = (...varietyIds: number[]) =>
  ({ id: 1, farm: 1, results: varietyIds.map((id, i) => ({ rank: i + 1, variety: { id } })) }) as any;

describe('guideVarietyId', () => {
  afterEach(() => useAppStore.getState().reset());

  it("keeps the guide's variety when it is one of the recommendation's", () => {
    useAppStore.setState({ latestRecommendation: rec(5, 9), latestGuide: { farm: 1, variety: 9 } });
    expect(guideVarietyId()).toBe(9);
  });

  it('sends nothing when the guide belongs to another recommendation', () => {
    useAppStore.setState({ latestRecommendation: rec(5, 9), latestGuide: { farm: 1, variety: 3 } });
    expect(guideVarietyId()).toBeUndefined();
  });

  it("ignores the previous farm's guide, even with the same varieties", () => {
    useAppStore.setState({ latestRecommendation: rec(5, 9), latestGuide: { farm: 2, variety: 5 } });
    expect(guideVarietyId()).toBeUndefined();
  });

  it('uses the pick just made for this recommendation over the guide on screen', () => {
    useAppStore.setState({
      latestRecommendation: rec(5, 9), latestGuide: { farm: 1, variety: 5 },
      pickedVariety: { recId: 1, varietyId: 9 },
    });
    expect(guideVarietyId()).toBe(9);
  });

  it('ignores a pick made for another recommendation', () => {
    useAppStore.setState({ latestRecommendation: rec(5, 9), latestGuide: null, pickedVariety: { recId: 7, varietyId: 9 } });
    expect(guideVarietyId()).toBeUndefined();
  });

  it('sends nothing without a guide', () => {
    useAppStore.setState({ latestRecommendation: rec(5, 9), latestGuide: null });
    expect(guideVarietyId()).toBeUndefined();
  });
});
