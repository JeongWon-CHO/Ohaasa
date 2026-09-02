import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getHasSeenOnboarding, getZodiacSign } from '@/src/lib/storage';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function routeByOnboardingState() {
      let seen = false;

      try {
        // 별자리가 이미 있으면 예전 버전에서 온보딩을 마친 사용자다.
        // 플래그가 없다고 다시 보여주면 기존 사용자가 온보딩을 또 겪는다.
        seen = (await getHasSeenOnboarding()) || (await getZodiacSign()) !== null;
      } catch {
        seen = false;
      }

      if (!isMounted) {
        return;
      }

      router.replace(seen ? '/(tabs)' : '/onboarding');
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
