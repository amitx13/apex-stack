import 'react-native-reanimated';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
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
};

function RootLayoutNav() {
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isInitialized]);

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

// In your app/_layout.tsx, update the RootLayout function:
export default function RootLayout() {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={CustomTheme}>
          <SafeAreaView
            style={{
              flex: 1,
              backgroundColor: CustomTheme.colors.background,
            }}
            edges={['top','bottom']}
          >
            <MessageProvider>
              <StatusBar
                style="light"
                backgroundColor={CustomTheme.colors.background}
              />
              <RootLayoutNav />
              <PortalHost />
            </MessageProvider>
          </SafeAreaView>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}