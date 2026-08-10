import { createClient } from '@supabase/supabase-js';

import type { ZodiacSign } from '@/src/constants/zodiac';
import type { ReportReason } from '@/src/lib/moderation';

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
  /**
   * device_id의 단방향 해시. "이 사용자 차단"에 쓸 안정적인 작성자 식별자가 필요하지만
   * device_id 자체는 노출할 수 없어서 도입했다 (해시로는 어떤 RLS도 통과하지 못한다).
   */
  author_hash: string;
}

const PUBLIC_ANSWER_COLUMNS =
  'id, question_date, zodiac_sign, body, like_count, created_at, author_hash';

export async function fetchPublicAnswers(
  date: string,
  scope: 'all' | ZodiacSign,
  sort: 'latest' | 'likes',
): Promise<PublicAnswer[]> {
  let query = supabase
    .from('question_answers')
    .select(PUBLIC_ANSWER_COLUMNS)
    .eq('question_date', date)
    // 신고 임계값에 도달해 자동 숨김 처리된 글은 제외한다.
    .is('hidden_at', null);

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

// ─── 오늘의 질문 — 신고 ────────────────────────────────────────
// question_answer_reports는 anon에게 INSERT만 열려 있다. SELECT를 열면 신고자들의
// device_id가 노출되므로, "내가 신고한 글"은 서버에서 되읽지 않고 로컬(moderation.ts)에서 관리한다.

export type ReportResult = { ok: boolean; error?: string };

export async function reportAnswer(
  answerId: string,
  deviceId: string,
  reason: ReportReason,
): Promise<ReportResult> {
  // device_id는 로그에 남기지 않는다 — RLS가 이걸 베어러 토큰처럼 신뢰하므로 사실상 자격증명이다.
  if (__DEV__) {
    console.log('[supabase] reportAnswer →', { answerId, reason });
  }

  const { error } = await supabase
    .from('question_answer_reports')
    .insert({ answer_id: answerId, device_id: deviceId, reason });

  // 23505 = 이미 신고한 글(기기당 1회 제한). 사용자 입장에서는 성공과 같다.
  if (error && error.code !== '23505') {
    console.warn('[supabase] reportAnswer failed:', error.code, error.message);
    return { ok: false, error: `${error.code ?? '?'} ${error.message}` };
  }

  return { ok: true };
}
