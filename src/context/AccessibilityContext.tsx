import React, { createContext, useContext, useState } from 'react';

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
  return (
    <A11yContext.Provider value={{
      isLargeText,
      toggleLargeText: () => setIsLargeText(v => !v),
    }}>
      {children}
    </A11yContext.Provider>
  );
};

export const useAccessibility = () => useContext(A11yContext);
