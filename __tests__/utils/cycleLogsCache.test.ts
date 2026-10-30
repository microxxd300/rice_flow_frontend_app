import { cachedActiveCycleLogs, clearCycleLogsCache, fetchActiveCycleLogs } from '@/utils/progressLogs';

jest.mock('@/services/apiService', () => ({
  apiProgress: {
    listCycles:   jest.fn(async (farmId: number) => ({ data: [{ id: farmId * 10, status: 'active' }] })),
    growthStages: jest.fn(async () => ({ data: [{ id: 11, stage_no: 1 }] })),
    listLogs:     jest.fn(async () => ({ data: [] })),
  },
}));

describe('remembered Progress data', () => {
  afterEach(() => clearCycleLogsCache());

  it('keeps the last result per farm, so the tab can open with it at once', async () => {
    expect(cachedActiveCycleLogs(7)).toBeUndefined();
    await fetchActiveCycleLogs(7);
    expect(cachedActiveCycleLogs(7)?.cycle.id).toBe(70);
    expect(cachedActiveCycleLogs(8)).toBeUndefined();   // another farm is not mixed in
  });

  it('forgets everything on logout', async () => {
    await fetchActiveCycleLogs(7);
    clearCycleLogsCache();
    expect(cachedActiveCycleLogs(7)).toBeUndefined();
  });
});
