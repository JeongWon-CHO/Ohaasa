import { createClient } from '@supabase/supabase-js';

import type { ZodiacSign } from '@/src/constants/zodiac';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UpsertDeviceParams {
  deviceId: string;
  zodiacSign: ZodiacSign;
  pushToken: string | null;
  platform: 'ios' | 'android' | null;
  notificationsEnabled: boolean;
}

export async function upsertDevice(params: UpsertDeviceParams): Promise<void> {
  const { error } = await supabase.from('user_devices').upsert(
    {
      device_id: params.deviceId,
      zodiac_sign: params.zodiacSign,
      push_token: params.pushToken,
      platform: params.platform,
      notifications_enabled: params.notificationsEnabled,
    },
    { onConflict: 'device_id' },
  );

  if (error) {
    console.warn('[supabase] upsertDevice failed:', error.message);
  }
}

// ─── 오늘의 질문 — 공개 답변 ───────────────────────────────────
// 공개 피드 조회는 device_id 컬럼을 절대 select하지 않는다.
// (다른 사용자가 device_id를 알아내 남의 글을 수정/삭제하는 것을 막기 위함)

export interface PublicAnswer {
  id: string;
  question_date: string;
  zodiac_sign: ZodiacSign;
  body: string;
  like_count: number;
  created_at: string;
}

const PUBLIC_ANSWER_COLUMNS = 'id, question_date, zodiac_sign, body, like_count, created_at';

export async function fetchPublicAnswers(
  date: string,
  scope: 'all' | ZodiacSign,
  sort: 'latest' | 'likes',
): Promise<PublicAnswer[]> {
  let query = supabase
    .from('question_answers')
    .select(PUBLIC_ANSWER_COLUMNS)
    .eq('question_date', date);

  if (scope !== 'all') {
    query = query.eq('zodiac_sign', scope);
  }

  query =
    sort === 'likes'
      ? query.order('like_count', { ascending: false }).order('created_at', { ascending: false })
      : query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.warn('[supabase] fetchPublicAnswers failed:', error.message);
    return [];
  }

  return data ?? [];
}

export async function upsertPublicAnswer(
  date: string,
  deviceId: string,
  zodiacSign: ZodiacSign,
  body: string,
): Promise<boolean> {
  const { error } = await supabase.from('question_answers').upsert(
    {
      question_date: date,
      device_id: deviceId,
      zodiac_sign: zodiacSign,
      body,
    },
    { onConflict: 'question_date,device_id' },
  );

  if (error) {
    console.warn('[supabase] upsertPublicAnswer failed:', error.message);
    return false;
  }

  return true;
}

export async function deletePublicAnswer(date: string, deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('question_answers')
    .delete()
    .eq('question_date', date)
    .eq('device_id', deviceId);

  if (error) {
    console.warn('[supabase] deletePublicAnswer failed:', error.message);
  }
}

export async function fetchMyAnswerId(date: string, deviceId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('question_answers')
    .select('id')
    .eq('question_date', date)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) {
    console.warn('[supabase] fetchMyAnswerId failed:', error.message);
    return null;
  }

  return data?.id ?? null;
}

export async function fetchMyLikedAnswerIds(
  answerIds: string[],
  deviceId: string,
): Promise<Set<string>> {
  if (answerIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('question_answer_likes')
    .select('answer_id')
    .eq('device_id', deviceId)
    .in('answer_id', answerIds);

  if (error) {
    console.warn('[supabase] fetchMyLikedAnswerIds failed:', error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.answer_id as string));
}

export async function toggleAnswerLike(
  answerId: string,
  deviceId: string,
  liked: boolean,
): Promise<boolean> {
  const { error } = liked
    ? await supabase
        .from('question_answer_likes')
        .insert({ answer_id: answerId, device_id: deviceId })
    : await supabase
        .from('question_answer_likes')
        .delete()
        .eq('answer_id', answerId)
        .eq('device_id', deviceId);

  if (error) {
    console.warn('[supabase] toggleAnswerLike failed:', error.message);
    return false;
  }

  return true;
}
