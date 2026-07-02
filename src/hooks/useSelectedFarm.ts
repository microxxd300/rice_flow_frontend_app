import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import type { Farm } from '@/services/apiService';

/**
 * Returns the currently selected farm (the one the app is showing).
 *
 * Self-heals: if no farm is selected yet, or the selected id no longer exists
 * (e.g. it was deleted), it falls back to the first farm and records that as the
 * selection. This guarantees every screen has a valid "current farm" to read.
 */
export function useSelectedFarm(): Farm | null {
  const farms          = useAppStore(s => s.farms);
  const selectedFarmId = useAppStore(s => s.selectedFarmId);
  const hydrateSelectedFarm = useAppStore(s => s.hydrateSelectedFarm);

  const selected =
    farms.find(f => f.id === selectedFarmId) ?? farms[0] ?? null;

  // Keep the store's selectedFarmId in sync when it's missing/stale.
  useEffect(() => {
    if (farms.length === 0) return;
    if (selectedFarmId == null || !farms.some(f => f.id === selectedFarmId)) {
      hydrateSelectedFarm(farms[0]?.id ?? null);
    }
  }, [farms, selectedFarmId, hydrateSelectedFarm]);

  return selected;
}
