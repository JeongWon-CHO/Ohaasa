import { router, useRootNavigationState, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useHoroscopeDateContext } from '@/src/context/HoroscopeDateContext';
import {
  getInitialNotificationTap,
  subscribeToNotificationTaps,
  type NotificationTap,
} from '@/src/lib/notifications';

/**
 * 운세 알림을 누르면 운세 화면으로 보낸다.
 *
 * 알림 payload에 `date`가 실려 오지만 쓰지 않는다 — 아침 알림을 밤에 확인하는 경우
 * 그 날짜를 그대로 열면 "지난 운세"가 뜨기 때문이다. 항상 최신 방송일로 맞춘다.
 *
 * 탭 시점이 아니라 "네비게이션이 준비된 뒤"에 이동한다. 콜드 스타트에서는
 * `app/index.tsx`가 온보딩 여부를 보고 `router.replace`를 하는 중이라,
 * 그전에 push하면 그 replace가 우리 화면을 덮어쓴다.
 */
export function usePushNavigation() {
  const { resetToLatestDate } = useHoroscopeDateContext();
  const navigationState = useRootNavigationState();
  const segments = useSegments();

  // 같은 알림으로 두 번 이동하지 않게 한다 — 콜드 스타트에서는
  // getInitialNotificationTap과 리스너가 같은 탭을 함께 알려줄 수 있다.
  const handledRef = useRef(new Set<string>());
  const [pendingTap, setPendingTap] = useState<NotificationTap | null>(null);

  const enqueue = useCallback((tap: NotificationTap) => {
    if (handledRef.current.has(tap.id)) return;
    handledRef.current.add(tap.id);
    setPendingTap(tap);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getInitialNotificationTap().then(tap => {
      if (!cancelled && tap) enqueue(tap);
    });
    return () => {
      cancelled = true;
    };
  }, [enqueue]);

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
    if (!pendingTap || !ready) return;
    setPendingTap(null);
    resetToLatestDate();
    // 이미 운세 화면이면 날짜만 최신으로 되돌린다 — push하면 같은 화면이 겹쳐 쌓인다.
    if (root !== 'horoscope') router.push('/horoscope');
  }, [pendingTap, ready, root, resetToLatestDate]);
}
