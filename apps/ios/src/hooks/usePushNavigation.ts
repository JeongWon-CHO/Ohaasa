import { router, useRootNavigationState, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useHoroscopeDateContext } from '@/src/context/HoroscopeDateContext';
import {
  claimNotificationTap,
  subscribeToNotificationTaps,
  type NotificationTap,
} from '@/src/lib/notifications';

/**
 * 운세 알림을 누르면 운세 화면으로 보낸다.
 *
 * 알림 payload에 `date`가 실려 오지만 쓰지 않는다 — 아침 알림을 밤에 확인하는 경우
 * 그 날짜를 그대로 열면 "지난 운세"가 뜨기 때문이다. 항상 최신 방송일로 맞춘다.
 *
 * 다루는 건 **앱이 살아 있는 동안 눌린 탭**뿐이다. 앱을 켠 알림은
 * `app/index.tsx`가 온보딩 여부와 함께 한 번에 정한다 — 여기서 처리하면
 * 네비게이션이 준비되기를 기다려야 해서 홈이 1초쯤 보였다가 넘어간다.
 * 리스너가 그 첫 탭까지 알려주는 경우가 있어 `claimNotificationTap`으로 거른다.
 *
 * 탭 시점이 아니라 "네비게이션이 준비된 뒤"에 이동한다. 백그라운드에서 눌러도
 * 복귀 직후에는 아직 스택이 서 있지 않을 수 있다.
 */
export function usePushNavigation() {
  const { resetToLatestDate } = useHoroscopeDateContext();
  const navigationState = useRootNavigationState();
  const segments = useSegments();

  // 같은 알림으로 두 번 이동하지 않게 한다 — 콜드 스타트에서는
  // getInitialNotificationTap과 리스너가 같은 탭을 함께 알려줄 수 있다.
  // 탭 자체는 ref에 담고 state로는 "새 탭이 왔다"만 알린다 — 아래 effect가
  // 처리 후 ref를 비우므로, 처리 때문에 다시 렌더가 도는 일이 없다.
  const pendingRef = useRef<NotificationTap | null>(null);
  const [tapTick, setTapTick] = useState(0);

  const enqueue = useCallback((tap: NotificationTap) => {
    if (!claimNotificationTap(tap.id)) return;
    pendingRef.current = tap;
    setTapTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    subscribeToNotificationTaps(enqueue).then(fn => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [enqueue]);

  const root = segments[0] as string | undefined;
  // segments가 비어 있으면 아직 스플래시(`index`)다. 온보딩 중이면 끼어들지 않는다.
  const ready = Boolean(navigationState?.key) && root !== undefined && root !== 'onboarding';

  useEffect(() => {
    if (!pendingRef.current || !ready) return;
    pendingRef.current = null;
    resetToLatestDate();
    // 이미 운세 화면이면 날짜만 최신으로 되돌린다 — push하면 같은 화면이 겹쳐 쌓인다.
    if (root !== 'horoscope') router.push('/horoscope');
  }, [tapTick, ready, root, resetToLatestDate]);
}
