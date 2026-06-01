import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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
      <Image
        source={require('../assets/images/splash-icon.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E6',
  },
  image: {
    width: 200,
    height: 200,
  },
});
