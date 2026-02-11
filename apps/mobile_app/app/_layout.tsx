import 'react-native-reanimated';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PortalHost } from '@rn-primitives/portal';
import { useAuthStore } from '../store/authStore';
import { DarkTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import "../global.css";
import { MessageProvider } from '@/contexts/MessageContext';

// Keep native splash visible
SplashScreen.preventAutoHideAsync();

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
  const rootNavState = useRootNavigationState();

  const isNavReady = !!rootNavState?.key;

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // 🚫 Do NOTHING until initialization finishes
    if (!isInitialized || !isNavReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
      return;
    }
  }, [isInitialized, isNavReady, isAuthenticated, segments, router]);

  if(!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={CustomTheme.colors.primary} />
      </View>
    )
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
  const { isInitialized } = useAuthStore();
  const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);
  const rootNavState = useRootNavigationState();
  const isNavReady = !!rootNavState?.key;

  const splashVisible = !isInitialized || !isNavReady || !splashAnimationFinished;

  useEffect(() => {
    // Hide native splash AFTER first frame
    requestAnimationFrame(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={CustomTheme}>
          <SafeAreaView
            style={{
              flex: 1,
              backgroundColor: CustomTheme.colors.background,
            }}
            edges={['top', 'bottom']}
          >
            <MessageProvider>
              <StatusBar
                style="light"
                backgroundColor={CustomTheme.colors.background}
              />
              {/* Pass splash state to prevent early navigation */}
              <RootLayoutNav />
              <PortalHost />
            </MessageProvider>
          </SafeAreaView>
        </ThemeProvider>
      </SafeAreaProvider>

      {/* Lottie Splash Screen Overlay */}
      {splashVisible && (
        <View style={styles.splashContainer} pointerEvents="none">
          <LottieView
            source={require('@/assets/animations/OG_IUS_SPLASH.json')}
            autoPlay
            loop={false}
            style={styles.animation}
            onAnimationFinish={() => {
              setSplashAnimationFinished(true);
            }}
          />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F1419',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
