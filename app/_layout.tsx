import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  useEffect(() => {
    // Yêu cầu quyền truy cập vị trí khi ứng dụng khởi động
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Quyền truy cập vị trí bị từ chối!');
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="screens/map" />
          <Stack.Screen name="screens/search" />
          <Stack.Screen name="screens/history" />
          <Stack.Screen name="screens/favorites" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
