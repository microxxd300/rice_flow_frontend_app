import { useEffect } from 'react';
import { AppState } from 'react-native';
import { syncFarmerNotices } from '@/services/farmerNoticeSync';

/** Checks for the admin's notices when the farmer opens the app or comes back to it. */
export function useFarmerNotices(): void {
  useEffect(() => {
    void syncFarmerNotices();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void syncFarmerNotices();
    });
    return () => sub.remove();
  }, []);
}
