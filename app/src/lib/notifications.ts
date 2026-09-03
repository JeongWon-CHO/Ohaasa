import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type PushTokenResult =
  | { token: string; platform: 'ios' | 'android' }
  | { token: null; platform: null };

export type NotifPermissionStatus =
  | { available: false }
  | { available: true; granted: boolean; canAskAgain: boolean };

const NULL_RESULT: PushTokenResult = { token: null, platform: null };
const NOOP_CLEANUP = () => {};

// Guard shared by both functions: Expo Go on Android triggers LogBox errors
// from expo-notifications module-level side effects, so we skip the import entirely.
function isExpoGoAndroid(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
    Platform.OS === 'android'
  );
}

/**
 * Sets the foreground notification display policy and subscribes to received events.
 * Returns a cleanup function that removes the listener subscription.
 * setNotificationHandler is intentionally NOT reversed on cleanup — it is an app-wide
 * policy and should persist for the app lifetime.
 */
export async function setupForegroundHandler(): Promise<() => void> {
  if (isExpoGoAndroid()) return NOOP_CLEANUP;

  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('[notifications] foreground notification received:', notification.request.identifier);
    });

    return () => subscription.remove();
  } catch (err) {
    console.warn('[notifications] setupForegroundHandler failed:', err);
    return NOOP_CLEANUP;
  }
}

export async function checkPermissionStatus(): Promise<NotifPermissionStatus> {
  if (isExpoGoAndroid() || !Device.isDevice) return { available: false };
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return { available: false };

  try {
    const Notifications = await import('expo-notifications');
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return { available: true, granted: status === 'granted', canAskAgain: canAskAgain ?? true };
  } catch {
    return { available: false };
  }
}

export async function requestPushToken(): Promise<PushTokenResult> {
  if (isExpoGoAndroid()) return NULL_RESULT;

  if (!Device.isDevice) {
    return NULL_RESULT;
  }

  const platform = Platform.OS;
  if (platform !== 'ios' && platform !== 'android') {
    return NULL_RESULT;
  }

  try {
    const Notifications = await import('expo-notifications');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    const finalStatus =
      existingStatus === 'granted'
        ? existingStatus
        : (await Notifications.requestPermissionsAsync()).status;

    if (finalStatus !== 'granted') {
      return NULL_RESULT;
    }

    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
        ?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return { token: tokenData.data, platform };
  } catch (err) {
    console.warn('[notifications] requestPushToken failed:', err);
    return NULL_RESULT;
  }
}

export type NotificationTap = { id: string };

/**
 * 알림을 눌러 앱이 켜진 경우 그 탭을 돌려준다(콜드 스타트). 아니면 null.
 *
 * 리스너는 이미 떠 있는 앱에서만 불리므로, 종료 상태에서 눌린 알림은 이걸로만 알 수 있다.
 */
export async function getInitialNotificationTap(): Promise<NotificationTap | null> {
  if (isExpoGoAndroid()) return null;

  try {
    const Notifications = await import('expo-notifications');
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return null;
    return { id: response.notification.request.identifier };
  } catch (err) {
    console.warn('[notifications] getInitialNotificationTap failed:', err);
    return null;
  }
}

/** 앱이 살아 있는 동안(포그라운드·백그라운드) 눌린 알림을 구독한다. */
export async function subscribeToNotificationTaps(
  onTap: (tap: NotificationTap) => void,
): Promise<() => void> {
  if (isExpoGoAndroid()) return NOOP_CLEANUP;

  try {
    const Notifications = await import('expo-notifications');
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      onTap({ id: response.notification.request.identifier });
    });
    return () => subscription.remove();
  } catch (err) {
    console.warn('[notifications] subscribeToNotificationTaps failed:', err);
    return NOOP_CLEANUP;
  }
}
