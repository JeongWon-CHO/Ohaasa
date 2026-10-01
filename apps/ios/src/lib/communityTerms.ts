import AsyncStorage from '@react-native-async-storage/async-storage';

export const COMMUNITY_TERMS_VERSION = '2026-10-01';
const KEY = 'ohaasa:community_terms_consent:v1';

export async function hasAcceptedCommunityTerms(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return false;
    const consent = JSON.parse(raw);
    return consent.version === COMMUNITY_TERMS_VERSION &&
      typeof consent.acceptedAt === 'string' && Number.isFinite(Date.parse(consent.acceptedAt));
  } catch {
    return false;
  }
}

export async function acceptCommunityTerms(): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({
    version: COMMUNITY_TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  }));
}

/** 개발 설정에서 약관 화면을 다시 확인할 때만 사용한다. */
export async function resetCommunityTermsForDevelopment(): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.removeItem(KEY);
}
