import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  NotoSansKR_300Light,
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_600SemiBold,
  NotoSansKR_700Bold,
} from '@expo-google-fonts/noto-sans-kr';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { HoroscopeDateProvider } from '@/src/context/HoroscopeDateContext';
import { ZodiacProvider } from '@/src/context/ZodiacContext';
import { usePushNavigation } from '@/src/hooks/usePushNavigation';
import { setupForegroundHandler } from '@/src/lib/notifications';

const AppLightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#FAF6F0' },
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    NotoSansKR_300Light,
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_600SemiBold,
    NotoSansKR_700Bold,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

/**
 * 알림 탭 라우팅은 `HoroscopeDateProvider` 안에서만 동작한다(날짜를 최신으로 되돌려야 하므로).
 * 훅 하나를 부르려고 provider를 옮기는 대신 자식 컴포넌트로 끼워 넣는다.
 */
function PushNavigationBridge() {
  usePushNavigation();
  return null;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    setupForegroundHandler().then(fn => { cleanup = fn; });
    return () => cleanup?.();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : AppLightTheme}>
      <ZodiacProvider>
        <HoroscopeDateProvider>
          <PushNavigationBridge />
          <StatusBar style="dark" />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="zodiac/[sign]" options={{ headerShown: false }} />
            <Stack.Screen name="daily-review" options={{ headerShown: false }} />
            <Stack.Screen name="daily-question" options={{ headerShown: false }} />
            <Stack.Screen name="sketch-prototype" options={{ headerShown: false }} />
            <Stack.Screen name="sketchbook" options={{ headerShown: false }} />
            <Stack.Screen name="mood-prototype" options={{ headerShown: false }} />
            <Stack.Screen name="journal-write" options={{ headerShown: false }} />
            <Stack.Screen name="journal-view" options={{ headerShown: false }} />
            <Stack.Screen name="horoscope" options={{ headerShown: false }} />
            <Stack.Screen name="rankings" options={{ headerShown: false }} />
            <Stack.Screen name="stats" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </HoroscopeDateProvider>
      </ZodiacProvider>
    </ThemeProvider>
  );
}
