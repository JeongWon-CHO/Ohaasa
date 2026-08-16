import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ZodiacSign } from '@/src/constants/zodiac';

export type AnswerVisibility = 'public' | 'private';

export type QuestionAnswer = {
  id: string; // = date (하루 1개)
  date: string; // YYYY-MM-DD
  zodiacSign: ZodiacSign;
  questionText: string; // 질문 뱅크가 바뀌어도 과거 기록이 불변하도록 스냅샷 저장
  body: string;
  visibility: AnswerVisibility;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'ohaasa:question_answers:v1';

function localDateStr(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * "올린 날에만 수정" 규칙의 유일한 구현. 공개 답변(로컬 createdAt)과 답글(서버 created_at)이
 * 같이 쓴다 — 답글은 로컬 미러가 없어 서버 값으로 판단한다.
 *
 * 서버 created_at은 UTC지만 `new Date(iso)`가 기기 로컬로 렌더하므로,
 * KST 08:50에 남긴 글(…T23:50Z)도 로컬 기준 오늘로 잡힌다.
 *
 * 이 규칙은 앱 UI에서만 막는다 — 서버 RLS는 USING(true)라 앱을 거치지 않으면 지난 글도 수정 가능하다.
 */
export function canEditByCreatedAt(createdAtIso: string): boolean {
  return localDateStr(new Date(createdAtIso)) === localDateStr(new Date());
}

/**
 * 비공개 답변은 내 기록일 뿐이라 언제든 고칠 수 있다.
 * 공개 답변은 남들이 읽고 공감한 뒤이므로 올린 날에만 수정 가능하고, 이후에는 삭제만 남긴다.
 *
 * 기준을 `date`(= question_date)가 아니라 `createdAt`으로 잡는 이유: question_date는 실제 오늘이
 * 아니라 방송 기준일(horoscope.date)이라, 주말·크론 미실행일에는 방금 남긴 글이 곧바로
 * "지난 글"로 잠겨버린다.
 */
export function canEditAnswer(answer: QuestionAnswer): boolean {
  if (answer.visibility === 'private') return true;
  return canEditByCreatedAt(answer.createdAt);
}

async function loadAll(): Promise<Record<string, QuestionAnswer>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, QuestionAnswer>;
  } catch {
    return {};
  }
}

export async function getQuestionAnswer(date: string): Promise<QuestionAnswer | null> {
  const all = await loadAll();
  return all[date] ?? null;
}

export async function getAllQuestionAnswers(): Promise<QuestionAnswer[]> {
  const all = await loadAll();
  return Object.values(all);
}

type UpsertParams = {
  date: string;
  zodiacSign: ZodiacSign;
  questionText: string;
  body: string;
  visibility: AnswerVisibility;
};

export async function upsertQuestionAnswer({
  date,
  zodiacSign,
  questionText,
  body,
  visibility,
}: UpsertParams): Promise<QuestionAnswer> {
  const all = await loadAll();
  const now = new Date().toISOString();
  const existing = all[date];

  const answer: QuestionAnswer = {
    id: date,
    date,
    zodiacSign,
    questionText,
    body,
    visibility,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [date]: answer }));
  return answer;
}

export async function deleteQuestionAnswer(date: string): Promise<void> {
  const all = await loadAll();
  if (!(date in all)) return;
  const { [date]: _, ...rest } = all;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}
