import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ZodiacSign } from '@/src/constants/zodiac';

export type DailyReviewDraft = {
  rating: number | null;
  memorableItems: string[];
  note: string;
};

export type DailyReview = {
  id: string; // `${date}:${zodiacSign}`
  date: string; // YYYY-MM-DD
  zodiacSign: ZodiacSign;
  rating: number;
  memorableItems: string[]; // 한국어 레이블 저장 — 추후 서버 동기화 시 코드값으로 마이그레이션 필요
  note: string;
  horoscopeRank: number | null;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
  remoteId?: string | null;
};

const STORAGE_KEY = 'ohaasa:daily_reviews:v1';

function makeId(date: string, zodiacSign: ZodiacSign): string {
  return `${date}:${zodiacSign}`;
}

async function loadAll(): Promise<Record<string, DailyReview>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, DailyReview>;
  } catch {
    return {};
  }
}

export async function getDailyReview(
  date: string,
  zodiacSign: ZodiacSign,
): Promise<DailyReview | null> {
  const all = await loadAll();
  return all[makeId(date, zodiacSign)] ?? null;
}

type UpsertParams = {
  draft: DailyReviewDraft & { rating: number };
  date: string;
  zodiacSign: ZodiacSign;
  horoscopeRank: number | null;
};

export async function upsertDailyReview({
  draft,
  date,
  zodiacSign,
  horoscopeRank,
}: UpsertParams): Promise<DailyReview> {
  const all = await loadAll();
  const id = makeId(date, zodiacSign);
  const now = new Date().toISOString();
  const existing = all[id];

  const review: DailyReview = {
    id,
    date,
    zodiacSign,
    rating: draft.rating,
    memorableItems: draft.memorableItems,
    note: draft.note,
    horoscopeRank,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    syncedAt: existing?.syncedAt ?? null,
    remoteId: existing?.remoteId ?? null,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [id]: review }));
  return review;
}
