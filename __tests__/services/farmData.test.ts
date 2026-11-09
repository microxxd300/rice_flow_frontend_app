import { loadFarmData } from '@/services/farmData';
import { apiProgress, apiRecommendations } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';
import { clearCycleLogsCache } from '@/utils/progressLogs';

jest.mock('@/services/apiService', () => ({
  apiRecommendations: { history: jest.fn() },
  apiProgress: { listCycles: jest.fn(), listLogs: jest.fn(), growthStages: jest.fn() },
}));

const history = apiRecommendations.history as jest.Mock;
const listCycles = apiProgress.listCycles as jest.Mock;
const listLogs = apiProgress.listLogs as jest.Mock;
const growthStages = apiProgress.growthStages as jest.Mock;

const row = {
  id: 12, farm_cycle: 44, log_date: '2026-11-09', growth_stage: 1,
  issue_type: '', severity: '', action_taken: '', observation: 'Field check',
};

beforeEach(() => {
  clearCycleLogsCache();
  useAppStore.setState({ selectedFarmId: null, progressLogs: [], activeCycle: null });
  history.mockResolvedValue({ data: [] });
  listCycles.mockResolvedValue({ data: [{ id: 44, status: 'active' }] });
  listLogs.mockResolvedValue({ data: [row] });
  growthStages.mockResolvedValue({ data: [{ id: 1, stage_no: 1 }] });
});

describe('loadFarmData', () => {
  it('keeps the farm\'s logs after a switch', async () => {
    useAppStore.getState().selectFarm(58);
    await loadFarmData({ id: 58 } as any);
    expect(useAppStore.getState().progressLogs.map(l => l.id)).toEqual(['12']);
    expect(useAppStore.getState().activeCycle?.id).toBe(44);
  });

  it('ignores the answer for a farm the farmer has left', async () => {
    useAppStore.getState().selectFarm(58);
    const loading = loadFarmData({ id: 58 } as any);
    useAppStore.getState().selectFarm(59);
    await loading;
    expect(useAppStore.getState().progressLogs).toEqual([]);
    expect(useAppStore.getState().activeCycle).toBeNull();
  });
});
