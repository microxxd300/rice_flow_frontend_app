import { create } from 'zustand';
import { HomeItem } from '../types';

interface HomeState {
  items: HomeItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setItems: (items: HomeItem[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchItems: () => Promise<void>;
  addItem: (item: HomeItem) => void;
  removeItem: (id: string) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  items: [],
  isLoading: false,
  error: null,

  setItems: (items) => set({ items }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchItems: async () => {
    try {
      set({ isLoading: true, error: null });

      // Mock API call - replace with actual apiClient.get call
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));

      const mockItems: HomeItem[] = [
        {
          id: '1',
          title: 'Sample Item 1',
          description: 'This is a sample item',
        },
        {
          id: '2',
          title: 'Sample Item 2',
          description: 'This is another sample item',
        },
      ];

      set({ items: mockItems, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch items',
        isLoading: false,
      });
    }
  },

  addItem: (item) => set(state => ({ 
    items: [item, ...state.items] 
  })),

  removeItem: (id) => set(state => ({
    items: state.items.filter(item => item.id !== id),
  })),
}));
