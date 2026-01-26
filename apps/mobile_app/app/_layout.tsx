import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { PortalHost } from '@rn-primitives/portal';
import { useAuthStore } from '../store/authStore';
import { DarkTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "../global.css";
import { MessageProvider } from '@/contexts/MessageContext';

const CustomTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: 'rgb(0, 173, 181)',
    background: 'rgb(34, 40, 49)',
    card: 'rgb(57, 62, 70)',
    text: 'rgb(238, 238, 238)',
    border: 'rgb(74, 79, 87)',
    notification: 'rgb(0, 173, 181)',
  },
  // dark: true,
};

function RootLayoutNav() {
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // 1️⃣ Initialize on app start: SecureStore → Zustand
  useEffect(() => {
    initialize();
  }, []);

  // Route protection and redirection
  useEffect(() => {
    if (!isInitialized) return; // Wait for initialization

    const inAuthGroup = segments[0] === '(auth)';

    console.log('🧭 Navigation check:', {
      isAuthenticated,
      inAuthGroup,
      segments,
    });

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated, redirect to login
      console.log('➡️ Redirecting to login');
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated, redirect to app
      console.log('➡️ Redirecting to app');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isInitialized]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#00ADB5" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationDuration: 350,
      }}
    >
      <Stack.Screen
        name="(auth)"
        options={{
          animation: 'fade',
          animationDuration: 250,
        }}
      />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={CustomTheme}>
          <SafeAreaView
            style={{
              flex: 1,
              backgroundColor: CustomTheme.colors.background,
            }}
            edges={['top']} // only protect status bar area
          >
            <MessageProvider>
              <StatusBar
                style="light"
                backgroundColor={CustomTheme.colors.background} // Android
              />
              <RootLayoutNav />
              <PortalHost />
            </MessageProvider>
          </SafeAreaView>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
