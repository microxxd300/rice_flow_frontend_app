import React from 'react';
import { AppWrapper } from './providers';
import { RootNavigator } from './navigation/RootNavigator';

/**
 * Root App component
 * Wraps the navigation with all necessary providers
 */
export const App: React.FC = () => {
  return (
    <AppWrapper>
      <RootNavigator />
    </AppWrapper>
  );
};

export default App;
