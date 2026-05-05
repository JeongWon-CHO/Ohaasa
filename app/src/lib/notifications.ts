import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type PushTokenResult =
  | { token: string; platform: 'ios' | 'android' }
  | { token: null; platform: null };

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
