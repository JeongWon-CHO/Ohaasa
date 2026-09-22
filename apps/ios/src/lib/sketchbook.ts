import AsyncStorage from '@react-native-async-storage/async-storage';

import { deserializeSketch, serializeSketch, type Sketch } from './sketch';

/**
 * 그림은 날짜별로 따로 저장한다.
 * 한 키에 몰아 넣으면 한 장을 읽거나 쓸 때마다 1년치를 통째로 JSON 파싱하게 되어
 * 갈수록 느려지고, 쓰다가 죽으면 전부 날아간다.
 *
 * 프로토타입이라 AsyncStorage를 쓴다. 실측 5.3KB/장 × 365일 ≈ 1.9MB이라
 * 안드로이드 기본 상한(6MB)에 2~3년이면 닿는다. 실제 구현은 expo-file-system에
 * 날짜별 파일로 두고 AsyncStorage에는 목록만 남기는 쪽이 맞다.
 */
const PREFIX = 'ohaasa:sketch:v1:';

const dayKey = (date: string) => `${PREFIX}${date}`;

export async function saveDaySketch(date: string, sketch: Sketch): Promise<void> {
  await AsyncStorage.setItem(dayKey(date), serializeSketch(sketch));
}

export async function loadDaySketch(date: string): Promise<Sketch | null> {
  const raw = await AsyncStorage.getItem(dayKey(date));
  return raw ? deserializeSketch(raw) : null;
}

export async function deleteDaySketch(date: string): Promise<void> {
  await AsyncStorage.removeItem(dayKey(date));
}

/** `yearMonth`는 `YYYY-MM`. 그림이 있는 날짜만 담겨 온다. */
export async function loadMonthSketches(yearMonth: string): Promise<Map<string, Sketch>> {
  const keys = await AsyncStorage.getAllKeys();
  const monthKeys = keys.filter((k) => k.startsWith(`${PREFIX}${yearMonth}-`));
  if (monthKeys.length === 0) return new Map();

  const entries = await AsyncStorage.multiGet(monthKeys);
  const result = new Map<string, Sketch>();
  for (const [key, raw] of entries) {
    if (!raw) continue;
    const sketch = deserializeSketch(raw);
    // 깨진 한 장이 그 달 전체를 못 열게 만들면 안 된다 — 조용히 건너뛴다.
    if (sketch) result.set(key.slice(PREFIX.length), sketch);
  }
  return result;
}

export async function clearAllSketches(): Promise<number> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(PREFIX));
  await AsyncStorage.multiRemove(mine);
  return mine.length;
}

// 날짜 헬퍼는 journal.ts도 쓰므로 dateKeys.ts로 옮겼다. 기존 import를 살려두기 위한 재export.
export { daysInMonth, toDateString, toYearMonth } from './dateKeys';
