import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MapScreen from './screens/map';

const AppLayout = () => {
  return (
    <SafeAreaProvider>
      <MapScreen />
    </SafeAreaProvider>
  );
};

export default AppLayout;
