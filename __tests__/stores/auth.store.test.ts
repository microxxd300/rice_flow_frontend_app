import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '@/app/store/auth.store';
import { useAppStore } from '@/store/appStore';
import { storage } from '@/services/storage';
import { authLogin, apiFarms } from '@/services/apiService';
import { STORAGE_KEYS } from '@/constants/api';

// The store talks to the backend and the phone's storage; tests replace both
// so they never hit the network.
jest.mock('@/services/storage', () => {
  const data = new Map<string, string>();
  return {
    storage: {
      getItem:    jest.fn(async (key: string) => (data.has(key) ? JSON.parse(data.get(key)!) : null)),
      setItem:    jest.fn(async (key: string, value: unknown) => { data.set(key, JSON.stringify(value)); }),
      removeItem: jest.fn(async (key: string) => { data.delete(key); }),
      clear:      jest.fn(async () => { data.clear(); }),
    },
  };
});

jest.mock('@/services/apiService', () => ({
  authLogin:    jest.fn(),
  authRegister: jest.fn(),
  apiFarms:     { list: jest.fn() },
}));

jest.mock('@/services/api', () => ({
  apiClient: { revokeRefreshToken: jest.fn(async () => {}) },
}));

jest.mock('@/services/tokenStorage', () => ({
  tokenStorage: {
    setTokens:       jest.fn(async () => {}),
    clear:           jest.fn(async () => {}),
    getAccessToken:  jest.fn(async () => null),
    getRefreshToken: jest.fn(async () => null),
  },
}));

const loginAs = (id: number) => {
  (authLogin as jest.Mock).mockResolvedValue({
    data: {
      user: { id, email: `farmer${id}@example.com`, first_name: 'Juan', last_name: 'Cruz' },
      access_token: 'access',
      refresh_token: 'refresh',
    },
  });
  (apiFarms.list as jest.Mock).mockResolvedValue({ data: [{ id: 100 + id, name: 'Farm' }] });
};

describe('Auth Store', () => {
  beforeEach(async () => {
    await storage.clear();
    useAppStore.getState().reset();
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('updates user on setUser', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('sets authenticated on setIsAuthenticated', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setIsAuthenticated(true);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login action', async () => {
    loginAs(1);
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login('farmer1@example.com', 'password123');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ id: '1', email: 'farmer1@example.com', name: 'Juan Cruz' });
    expect(useAppStore.getState().selectedFarmId).toBe(101);
  });

  it('handles logout action', async () => {
    loginAs(1);
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login('farmer1@example.com', 'password123');
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
  });

  it("drops the previous account's cached recommendation when another farmer logs in", async () => {
    // Farmer 1's session expired with their recommendation still cached on the phone
    await storage.setItem(STORAGE_KEYS.USER, { id: '1', email: 'farmer1@example.com', name: 'Juan' });
    await storage.setItem(STORAGE_KEYS.LATEST_REC, { id: 37, farm: 101, results: [] });

    loginAs(2);
    await act(async () => {
      await useAuthStore.getState().login('farmer2@example.com', 'password123');
    });

    expect(useAppStore.getState().latestRecommendation).toBeNull();
    expect(await storage.getItem(STORAGE_KEYS.LATEST_REC)).toBeNull();
  });

  it("restores the same farmer's cached recommendation for their selected farm", async () => {
    await storage.setItem(STORAGE_KEYS.USER, { id: '1', email: 'farmer1@example.com', name: 'Juan' });
    await storage.setItem(STORAGE_KEYS.SETUP_COMPLETE, true);
    await storage.setItem(STORAGE_KEYS.LATEST_REC, { id: 38, farm: 101, results: [] });

    loginAs(1);
    await act(async () => {
      await useAuthStore.getState().login('farmer1@example.com', 'password123');
    });

    expect(useAppStore.getState().latestRecommendation?.id).toBe(38);
  });
});
