import * as Location from 'expo-location';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Giữ màn hình splash hiển thị cho đến khi ứng dụng sẵn sàng
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { theme } = useTheme();

  useEffect(() => {
    // Yêu cầu quyền truy cập vị trí khi ứng dụng khởi động
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Quyền truy cập vị trí bị từ chối!');
      }
    })();

    // Ẩn splash screen sau khi giao diện người dùng đã được tải
    const hideSplash = async () => {
      await SplashScreen.hideAsync();
    };
    
    hideSplash();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Slot />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
