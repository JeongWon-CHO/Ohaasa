import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { ZodiacSign } from '@/src/constants/zodiac';
import { getZodiacSign } from '@/src/lib/storage';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function routeByOnboardingState() {
      let zodiacSign: ZodiacSign | null = null;

      try {
        zodiacSign = await getZodiacSign();
      } catch {
        zodiacSign = null;
      }

      if (!isMounted) {
        return;
      }

      router.replace(zodiacSign ? '/(tabs)' : '/onboarding');
    }

    routeByOnboardingState();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>Preparing app...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 12,
  },
  text: {
    color: '#4b5563',
    fontSize: 14,
  },
});
