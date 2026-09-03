import AsyncStorage from '@react-native-async-storage/async-storage';

import { deserializeSketch, emptySketch, serializeSketch, type Sketch } from './sketch';

/**
 * 하루치 그림일기.
 *
 * 기존 운세 리뷰(`dailyReviews.ts`, 키 `ohaasa:daily_reviews:v1`)는 **건드리지 않는다.**
 * 안드로이드에서 돌아가는 기능이고 키가 다르므로 둘은 그냥 공존한다.
 * 변환하지 않으면 데이터가 그 자리에 남아 있어서, 나중에 "예전 기록도 가져올까"가
 * 여전히 선택지로 열려 있다. 지금 변환했다가 규칙이 틀리면 되돌릴 방법이 없다.
 *
 * mood를 카테고리 문자열이 아니라 0~100 숫자로 두는 이유는 확장 방향을 막지 않기
 * 위해서다 — 5단계로 받다가 슬라이더로 열어도 기존 값이 그대로 유효하다.
 */
export interface DailyJournal {
  /** YYYY-MM-DD */
  date: string;
  /** 0~100. 지금은 표정 5단계라 20/40/60/80/100만 들어온다. */
  mood: number;
  sketch: Sketch;
  /** 오늘의 한마디. 비워둘 수 있다. */
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export type JournalDraft = Pick<DailyJournal, 'mood' | 'sketch' | 'summary'>;

export function emptyDraft(): JournalDraft {
  return { mood: 60, sketch: emptySketch(), summary: '' };
}

/**
 * 날짜별 키. 한 키에 몰아 넣으면 한 장을 읽고 쓸 때마다 1년치를 JSON 파싱하게 되고,
 * 쓰다가 죽으면 전부 날아간다.
 *
 * 그림(sketch)이 대부분의 용량이라 실측 5.3KB/장 × 365일 ≈ 1.9MB다.
 * 안드로이드 AsyncStorage 기본 상한(6MB)에 2~3년이면 닿으므로,
 * 실제 운영에 올릴 때는 expo-file-system에 날짜별 파일로 옮겨야 한다.
 */
const PREFIX = 'ohaasa:journal:v1:';

const key = (date: string) => `${PREFIX}${date}`;

/** 저장 형식. sketch만 별도 직렬화를 거쳐 좌표 자리수를 줄인다. */
function serialize(journal: DailyJournal): string {
  return JSON.stringify({
    ...journal,
    sketch: JSON.parse(serializeSketch(journal.sketch)),
  });
}

function deserialize(raw: string): DailyJournal | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.date !== 'string' || typeof parsed?.mood !== 'number') return null;
    const sketch = deserializeSketch(JSON.stringify(parsed.sketch));
    if (!sketch) return null;
    return { ...parsed, sketch } as DailyJournal;
  } catch {
    return null;
  }
}

export async function loadJournal(date: string): Promise<DailyJournal | null> {
  const raw = await AsyncStorage.getItem(key(date));
  return raw ? deserialize(raw) : null;
}

/** 이미 있으면 createdAt을 보존한다 — 수정 기한 판정이 createdAt 기준이라 덮으면 안 된다. */
export async function saveJournal(
  date: string,
  draft: JournalDraft,
): Promise<DailyJournal> {
  const now = new Date().toISOString();
  const existing = await loadJournal(date);
  const journal: DailyJournal = {
    date,
    ...draft,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await AsyncStorage.setItem(key(date), serialize(journal));
  return journal;
}

export async function deleteJournal(date: string): Promise<void> {
  await AsyncStorage.removeItem(key(date));
}

/** `yearMonth`는 `YYYY-MM`. 기록이 있는 날짜만 담겨 온다. */
export async function loadMonthJournals(
  yearMonth: string,
): Promise<Map<string, DailyJournal>> {
  const keys = await AsyncStorage.getAllKeys();
  const monthKeys = keys.filter((k) => k.startsWith(`${PREFIX}${yearMonth}-`));
  if (monthKeys.length === 0) return new Map();

  const entries = await AsyncStorage.multiGet(monthKeys);
  const result = new Map<string, DailyJournal>();
  for (const [k, raw] of entries) {
    if (!raw) continue;
    const journal = deserialize(raw);
    // 깨진 하루가 그 달 전체를 못 열게 만들면 안 된다 — 조용히 건너뛴다.
    if (journal) result.set(k.slice(PREFIX.length), journal);
  }
  return result;
}

/**
 * 기록이 있는 날짜만 최신순으로. **키 목록만 훑고 본문은 파싱하지 않는다.**
 *
 * 보관함은 "어느 달에 기록이 있나"를 먼저 알아야 섹션을 만들 수 있는데,
 * 그걸 위해 `loadMonthJournals`를 달마다 부르면 화면에 보이지도 않는 달의
 * 그림까지 전부 역직렬화하게 된다. 용량 얘기는 위 PREFIX 주석 참고.
 */
export async function loadJournalDates(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length))
    .sort((a, b) => b.localeCompare(a));
}

export async function clearAllJournals(): Promise<number> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(PREFIX));
  await AsyncStorage.multiRemove(mine);
  return mine.length;
}
