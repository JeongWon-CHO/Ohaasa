import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { ZODIAC_LIST, type ZodiacSign } from '@/src/constants/zodiac';

export const STORAGE_KEYS = {
  deviceId: 'ohaasa:device_id',
  zodiacSign: 'ohaasa:zodiac_sign',
  notificationsEnabled: 'ohaasa:notifications_enabled',
  pushToken: 'ohaasa:push_token',
  platform: 'ohaasa:platform',
  hasAskedPushPermission: 'ohaasa:has_asked_push_permission',
  hasSeenOnboarding: 'ohaasa:has_seen_onboarding',
} as const;

const ZODIAC_SIGNS = new Set<ZodiacSign>(ZODIAC_LIST.map((zodiac) => zodiac.sign));

function isZodiacSign(value: unknown): value is ZodiacSign {
  return typeof value === 'string' && ZODIAC_SIGNS.has(value as ZodiacSign);
}

function createDeviceId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return Crypto.randomUUID();
}

export async function getDeviceId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.deviceId);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const storedDeviceId = await getDeviceId();

  if (storedDeviceId) {
    return storedDeviceId;
  }

  const deviceId = createDeviceId();
  await AsyncStorage.setItem(STORAGE_KEYS.deviceId, deviceId);
  return deviceId;
}

export async function getZodiacSign(): Promise<ZodiacSign | null> {
  const storedZodiacSign = await AsyncStorage.getItem(STORAGE_KEYS.zodiacSign);

  if (isZodiacSign(storedZodiacSign)) {
    return storedZodiacSign;
  }

  if (storedZodiacSign !== null) {
    await AsyncStorage.removeItem(STORAGE_KEYS.zodiacSign);
  }

  return null;
}

export async function setZodiacSign(zodiacSign: ZodiacSign): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.zodiacSign, zodiacSign);
}

export async function clearZodiacSign(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.zodiacSign);
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.notificationsEnabled);
  return stored === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.notificationsEnabled, String(enabled));
}

export async function getPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.pushToken);
}

export async function setPushToken(token: string | null): Promise<void> {
  if (token === null) {
    await AsyncStorage.removeItem(STORAGE_KEYS.pushToken);
  } else {
    await AsyncStorage.setItem(STORAGE_KEYS.pushToken, token);
  }
}

export async function getPlatform(): Promise<'ios' | 'android' | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.platform);
  if (stored === 'ios' || stored === 'android') return stored;
  return null;
}

export async function setPlatform(platform: 'ios' | 'android' | null): Promise<void> {
  if (platform === null) {
    await AsyncStorage.removeItem(STORAGE_KEYS.platform);
  } else {
    await AsyncStorage.setItem(STORAGE_KEYS.platform, platform);
  }
}

export async function getHasAskedPushPermission(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.hasAskedPushPermission);
  return stored === 'true';
}

export async function setHasAskedPushPermission(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.hasAskedPushPermission, 'true');
}

/**
 * 온보딩을 지나온 적이 있는가.
 *
 * 별자리 유무로 판정하면 안 된다 — 별자리는 건너뛸 수 있는 선택 항목이 되었고,
 * 그러면 건너뛴 사용자가 앱을 열 때마다 온보딩으로 되돌아온다.
 */
export async function getHasSeenOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.hasSeenOnboarding)) === 'true';
}

export async function setHasSeenOnboarding(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.hasSeenOnboarding, 'true');
}
