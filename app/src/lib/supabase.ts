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

/**
 * 작성·수정 공용.
 *
 * ON CONFLICT DO UPDATE라 수정해도 행의 id가 유지된다 — 이건 답글이 부모를 참조하는 구조상
 * load-bearing이다. delete + insert로 바꾸면 답변을 고칠 때마다 달린 답글이 전부 cascade로 날아간다.
 */
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

export type ReportResult = {
  ok: boolean;
  /** 개발 빌드 토스트·로그용 원문. 사용자에게 그대로 보여주지 않는다. */
  error?: string;
  /**
   * 서버에 닿지도 못한 경우(오프라인 등). 사용자가 할 수 있는 일이 달라서 구분한다 —
   * 이쪽은 "네트워크를 확인하세요"가 맞고, 서버가 거절한 경우는 확인해봐야 소용없다.
   * PostgREST는 DB·RLS 에러에 항상 코드를 붙이므로 코드가 없으면 전송 자체가 실패한 것으로 본다.
   */
  offline?: boolean;
};

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
    return { ok: false, error: `${error.code ?? '?'} ${error.message}`, offline: !error.code };
  }

  return { ok: true };
}

// ─── 오늘의 질문 — 답글 ────────────────────────────────────────
// 공개 답변과 같은 규칙이 그대로 적용된다: device_id는 어떤 경로로도 클라이언트에 내려보내지 않고,
// 숨김 필터(hidden_at)는 RLS가 아니라 쿼리에 둔다.

export interface PublicReply {
  id: string;
  answer_id: string;
  zodiac_sign: ZodiacSign;
  body: string;
  like_count: number;
  created_at: string;
  /** PublicAnswer.author_hash와 같은 PEPPER로 만든 해시 — 차단 한 번이 답변·답글에 동시에 걸린다. */
  author_hash: string;
}

const PUBLIC_REPLY_COLUMNS =
  'id, answer_id, zodiac_sign, body, like_count, created_at, author_hash';

/**
 * 하루치 답글을 한 번에 받는 상한.
 *
 * 피드가 무페이지네이션이라 가능한 설계다. 피드에 페이지네이션이 들어오면 답글도
 * 펼칠 때 지연 로딩으로 바꿔야 하고, 그때는 배지용 reply_count 컬럼이 다시 필요해진다.
 */
const REPLY_FETCH_LIMIT = 1000;

/**
 * 피드에 보이는 답변들의 답글을 한 번에 받는다.
 *
 * 정렬은 항상 오래된 순이다 — 스레드는 대화 순서로 읽히므로 피드의 최신순/공감순 토글을
 * 답글에 적용하지 않는다.
 */
export async function fetchRepliesForAnswers(answerIds: string[]): Promise<PublicReply[]> {
  if (answerIds.length === 0) return [];

  const { data, error } = await supabase
    .from('question_answer_replies')
    .select(PUBLIC_REPLY_COLUMNS)
    .in('answer_id', answerIds)
    // 신고 임계값에 도달해 자동 숨김 처리된 답글은 제외한다.
    .is('hidden_at', null)
    .order('created_at', { ascending: true })
    .limit(REPLY_FETCH_LIMIT);

  if (error) {
    console.warn('[supabase] fetchRepliesForAnswers failed:', error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as PublicReply[];

  // 상한에 닿으면 초과분이 조용히 잘린다 — 에러도 빈 자리도 남지 않아서, 사용자 눈에는
  // "답글이 원래 그만큼"으로 보이고 배지 숫자까지 함께 줄어 어디서도 티가 나지 않는다.
  // 이 경고가 찍히기 시작했다면 피드 페이지네이션 + 답글 지연 로딩으로 옮길 시점이다.
  if (rows.length >= REPLY_FETCH_LIMIT) {
    console.warn(
      `[supabase] fetchRepliesForAnswers: 상한 ${REPLY_FETCH_LIMIT}건에 도달해 일부 답글이 잘렸을 수 있습니다`,
    );
  }

  return rows;
}

/**
 * 작성·수정 공용. 저장된 행을 그대로 돌려주므로 호출부는 refetch 없이 목록에 끼워 넣을 수 있다
 * (id · created_at · author_hash가 서버 생성이라 낙관적 삽입이 불가능하다).
 *
 * payload에 created_at이 없어 수정해도 보존된다 → "올린 날에만 수정" 규칙이 유지된다.
 */
export async function upsertPublicReply(
  answerId: string,
  deviceId: string,
  zodiacSign: ZodiacSign,
  body: string,
): Promise<PublicReply | null> {
  const { data, error } = await supabase
    .from('question_answer_replies')
    .upsert(
      {
        answer_id: answerId,
        device_id: deviceId,
        zodiac_sign: zodiacSign,
        body,
      },
      { onConflict: 'answer_id,device_id' },
    )
    .select(PUBLIC_REPLY_COLUMNS)
    .single();

  if (error) {
    console.warn('[supabase] upsertPublicReply failed:', error.message);
    return null;
  }

  return data as unknown as PublicReply;
}

/** id만으로 지우지 않는다. RLS가 USING(true)라 device_id 매칭이 유일한 소유권 검사다. */
export async function deletePublicReply(replyId: string, deviceId: string): Promise<boolean> {
  const { error } = await supabase
    .from('question_answer_replies')
    .delete()
    .eq('id', replyId)
    .eq('device_id', deviceId);

  if (error) {
    console.warn('[supabase] deletePublicReply failed:', error.message);
    return false;
  }

  return true;
}

/**
 * answer_id → 내 답글 id.
 *
 * hidden_at을 필터하지 않는다 — 자동 숨김된 내 답글이 있는데 작성창을 다시 열어주면
 * 숨김을 우회해 새로 쓸 수 있게 된다.
 */
export async function fetchMyReplyIds(
  answerIds: string[],
  deviceId: string,
): Promise<Map<string, string>> {
  if (answerIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('question_answer_replies')
    .select('id, answer_id')
    .eq('device_id', deviceId)
    .in('answer_id', answerIds);

  if (error) {
    console.warn('[supabase] fetchMyReplyIds failed:', error.message);
    return new Map();
  }

  return new Map((data ?? []).map((row) => [row.answer_id as string, row.id as string]));
}

export async function fetchMyLikedReplyIds(
  replyIds: string[],
  deviceId: string,
): Promise<Set<string>> {
  if (replyIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('question_answer_reply_likes')
    .select('reply_id')
    .eq('device_id', deviceId)
    .in('reply_id', replyIds);

  if (error) {
    console.warn('[supabase] fetchMyLikedReplyIds failed:', error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.reply_id as string));
}

export async function toggleReplyLike(
  replyId: string,
  deviceId: string,
  liked: boolean,
): Promise<boolean> {
  const { error } = liked
    ? await supabase
        .from('question_answer_reply_likes')
        .insert({ reply_id: replyId, device_id: deviceId })
    : await supabase
        .from('question_answer_reply_likes')
        .delete()
        .eq('reply_id', replyId)
        .eq('device_id', deviceId);

  if (error) {
    console.warn('[supabase] toggleReplyLike failed:', error.message);
    return false;
  }

  return true;
}

export async function reportReply(
  replyId: string,
  deviceId: string,
  reason: ReportReason,
): Promise<ReportResult> {
  // device_id는 로그에 남기지 않는다 — RLS가 이걸 베어러 토큰처럼 신뢰하므로 사실상 자격증명이다.
  if (__DEV__) {
    console.log('[supabase] reportReply →', { replyId, reason });
  }

  const { error } = await supabase
    .from('question_answer_reply_reports')
    .insert({ reply_id: replyId, device_id: deviceId, reason });

  // 23505 = 이미 신고한 답글(기기당 1회 제한). 사용자 입장에서는 성공과 같다.
  if (error && error.code !== '23505') {
    console.warn('[supabase] reportReply failed:', error.code, error.message);
    return { ok: false, error: `${error.code ?? '?'} ${error.message}`, offline: !error.code };
  }

  return { ok: true };
}
