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
