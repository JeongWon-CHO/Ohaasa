import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type PushTokenResult =
  | { token: string; platform: 'ios' | 'android' }
  | { token: null; platform: null };

const NULL_RESULT: PushTokenResult = { token: null, platform: null };

export async function requestPushToken(): Promise<PushTokenResult> {
  // Guard must run before dynamic import — module-level side effects in
  // expo-notifications trigger the Android Expo Go warning at import time.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Platform.OS === 'android') {
    return NULL_RESULT;
  }

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
