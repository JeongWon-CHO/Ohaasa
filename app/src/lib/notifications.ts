import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PushTokenResult =
  | { token: string; platform: 'ios' | 'android' }
  | { token: null; platform: null };

const NULL_RESULT: PushTokenResult = { token: null, platform: null };

export async function requestPushToken(): Promise<PushTokenResult> {
  try {
    // Android Expo Go (SDK 53+): remote push notifications removed from Expo Go.
    // Skip silently — upsert will still run with push_token = null.
    if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
      return NULL_RESULT;
    }

    if (!Device.isDevice) {
      return NULL_RESULT;
    }

    const platform = Platform.OS;
    if (platform !== 'ios' && platform !== 'android') {
      return NULL_RESULT;
    }

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

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: tokenData.data, platform };
  } catch (err) {
    console.warn('[notifications] requestPushToken failed:', err);
    return NULL_RESULT;
  }
}
