import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/services/storage';

// Device-level accessibility preference, deliberately NOT per-user: whoever
// picks up the phone needs the same readable text.
const STORAGE_KEY = 'a11y_large_text';

interface A11yContextType {
  isLargeText: boolean;
  toggleLargeText: () => void;
}

const A11yContext = createContext<A11yContextType>({
  isLargeText: false,
  toggleLargeText: () => {},
});

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLargeText, setIsLargeText] = useState(false);

  // Restore the farmer's choice on launch. Without this the setting silently
  // reverted every time the app was reopened, which read as a broken toggle.
  useEffect(() => {
    storage.getItem<boolean>(STORAGE_KEY)
      .then(saved => { if (saved === true) setIsLargeText(true); })
      .catch(() => {});
  }, []);

  const toggleLargeText = () => {
    setIsLargeText(prev => {
      const next = !prev;
      storage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  return (
    <A11yContext.Provider value={{ isLargeText, toggleLargeText }}>
      {children}
    </A11yContext.Provider>
  );
};

export const useAccessibility = () => useContext(A11yContext);
