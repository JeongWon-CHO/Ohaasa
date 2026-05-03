import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { ZODIAC_LIST, type ZodiacSign } from '@/src/constants/zodiac';

export const STORAGE_KEYS = {
  deviceId: 'ohaasa:device_id',
  zodiacSign: 'ohaasa:zodiac_sign',
  notificationsEnabled: 'ohaasa:notifications_enabled',
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
