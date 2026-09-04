import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  claimNotificationTap,
  getInitialNotificationTap,
} from '@/src/lib/notifications';
import { getHasSeenOnboarding, getZodiacSign } from '@/src/lib/storage';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function routeByOnboardingState() {
      let seen = false;
      let tap = null;

      try {
        // 알림 확인을 저장소 읽기와 **겹쳐서** 돌린다. 이 화면이 갈 곳을 정할 때
        // 알림 여부를 이미 알고 있어야, 홈에 들렀다 뒤늦게 운세로 넘어가지 않는다.
        // expo-notifications는 동적 import라 콜드 스타트에서 짧지 않다(→ notifications.ts).
        [seen, tap] = await Promise.all([
          // 별자리가 이미 있으면 예전 버전에서 온보딩을 마친 사용자다.
          // 플래그가 없다고 다시 보여주면 기존 사용자가 온보딩을 또 겪는다.
          (async () =>
            (await getHasSeenOnboarding()) || (await getZodiacSign()) !== null)(),
          getInitialNotificationTap(),
        ]);
      } catch {
        seen = false;
      }

      if (!isMounted) {
        return;
      }

      router.replace(seen ? '/(tabs)' : '/onboarding');

      // 운세 알림으로 켜진 경우엔 같은 tick에 운세까지 밀어 넣는다. 홈을 거치긴 하지만
      // 머물지 않고, 뒤로가기를 누르면 홈이 남아 있어야 하므로 replace가 아니라 push다.
      // 온보딩 중이면 끼어들지 않되 탭은 가져간다 — 안 그러면 훅이 나중에 다시 연다.
      if (tap && claimNotificationTap(tap.id) && seen) {
        router.push('/horoscope');
      }
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
