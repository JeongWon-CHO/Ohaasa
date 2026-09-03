import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ZodiacSign } from '@/src/constants/zodiac';
import {
  addBlockedAuthor,
  addHiddenAnswerId,
  getBlockedAuthors,
  getHiddenAnswerIds,
  removeHiddenAnswerId,
  type ReportReason,
} from '@/src/lib/moderation';
import {
  fetchMyAnswerId,
  fetchMyLikedAnswerIds,
  fetchPublicAnswers,
  reportAnswer as reportAnswerRemote,
  toggleAnswerLike,
  type PublicAnswer,
  type ReportResult,
} from '@/src/lib/supabase';

export type AnswerFeedScope = 'all' | ZodiacSign;
export type AnswerFeedSort = 'latest' | 'likes';
/** 상단 세그먼트 탭. 별자리 필터(filterSign)와는 독립적으로 관리된다. */
export type AnswerFeedTab = 'all' | 'mine';

type UseAnswerFeedResult = {
  answers: PublicAnswer[];
  likedIds: Set<string>;
  myAnswerId: string | null;
  toggleLike: (answerId: string) => void;
  /**
   * 신고 → 로컬에서 즉시 숨김 + 서버에 신고 기록. 임계값에 도달하면 서버가 전체 공개에서 제외한다.
   * 전송이 실패하면 숨김을 되돌리고 false를 반환한다 (호출부가 사용자에게 알려야 한다).
   */
  report: (answerId: string, reason: ReportReason) => Promise<ReportResult>;
  /** 작성자 차단 → 이 기기에서 해당 작성자의 글이 오늘 것도 앞으로 올라올 것도 보이지 않는다. */
  blockAuthor: (authorHash: string) => void;
  /**
   * 답글 목록(useAnswerReplies)이 같은 Set을 보게 하려고 노출한다.
   * 각자 getBlockedAuthors()를 읽으면 답글에서 차단했을 때 그 사람의 답변 카드는 화면에 남고
   * 그 아래 답글만 사라진다 — 쓰기 주체(blockAuthor)도 여기 하나로 유지한다.
   */
  blockedAuthors: Set<string>;
  loading: boolean;
  error: boolean;
  refetch: () => void;
};

export function useAnswerFeed(
  date: string | null,
  scope: AnswerFeedScope,
  sort: AnswerFeedSort,
  deviceId: string | null,
): UseAnswerFeedResult {
  const [answers, setAnswers] = useState<PublicAnswer[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [myAnswerId, setMyAnswerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [blockedAuthors, setBlockedAuthors] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  // 신고·차단 목록은 기기 로컬에만 있다. 서버 응답을 기다리지 않고 바로 필터에 쓴다.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getBlockedAuthors(), getHiddenAnswerIds()]).then(([blocked, hidden]) => {
      if (cancelled) return;
      setBlockedAuthors(blocked);
      setHiddenIds(hidden);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!date || !deviceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 조회를 시작하기 전에 이전 결과를 비우는 자리다. 지우지 않으면 date/별자리를 바꾼 순간 남의 데이터가 잠깐 보인다.
      setAnswers([]);
      setLikedIds(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const [list, myId] = await Promise.all([
          fetchPublicAnswers(date, scope, sort),
          fetchMyAnswerId(date, deviceId),
        ]);
        if (cancelled) return;
        setAnswers(list);
        setMyAnswerId(myId);

        const liked = await fetchMyLikedAnswerIds(
          list.map((a) => a.id),
          deviceId,
        );
        if (cancelled) return;
        setLikedIds(liked);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, scope, sort, deviceId, reloadTick]);

  const toggleLike = useCallback(
    (answerId: string) => {
      if (!deviceId) return;

      const wasLiked = likedIds.has(answerId);
      const nextLiked = !wasLiked;

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (nextLiked) next.add(answerId);
        else next.delete(answerId);
        return next;
      });
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === answerId
            ? { ...a, like_count: a.like_count + (nextLiked ? 1 : -1) }
            : a,
        ),
      );

      toggleAnswerLike(answerId, deviceId, nextLiked).then((ok) => {
        if (ok) return;
        // 실패 시 롤백
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (nextLiked) next.delete(answerId);
          else next.add(answerId);
          return next;
        });
        setAnswers((prev) =>
          prev.map((a) =>
            a.id === answerId
              ? { ...a, like_count: a.like_count + (nextLiked ? -1 : 1) }
              : a,
          ),
        );
      });
    },
    [deviceId, likedIds],
  );

  /**
   * 낙관적으로 먼저 숨기고, 서버 전송이 실패하면 되돌린다.
   *
   * 실패해도 숨긴 채로 두면 사용자는 신고가 접수됐다고 믿는데 서버에는 아무것도 남지 않아
   * 그 글이 영영 검토되지 않는다. 되돌려서 다시 시도할 수 있게 하는 편이 정직하다.
   * "이 글을 그냥 안 보고 싶다"는 요구는 차단(로컬 전용이라 항상 성공)이 담당한다.
   */
  const report = useCallback(
    async (answerId: string, reason: ReportReason): Promise<ReportResult> => {
      setHiddenIds((prev) => new Set(prev).add(answerId));
      await addHiddenAnswerId(answerId);

      const result: ReportResult = deviceId
        ? await reportAnswerRemote(answerId, deviceId, reason)
        : { ok: false, error: 'device_id 없음 — 신고 요청을 보내지 않았습니다' };

      if (result.ok) return result;

      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(answerId);
        return next;
      });
      await removeHiddenAnswerId(answerId);
      return result;
    },
    [deviceId],
  );

  const blockAuthor = useCallback((authorHash: string) => {
    // author_hash가 비어 있으면(마이그레이션 미적용 등) 차단 목록에 undefined가 들어가고,
    // 그러면 author_hash 없는 모든 글이 한꺼번에 사라진다. 조용히 무시하는 편이 낫다.
    if (!authorHash) {
      console.warn('[useAnswerFeed] blockAuthor: author_hash가 비어 있어 차단을 건너뜁니다');
      return;
    }
    setBlockedAuthors((prev) => new Set(prev).add(authorHash));
    void addBlockedAuthor(authorHash);
  }, []);

  const visibleAnswers = useMemo(
    () =>
      answers.filter(
        (answer) =>
          !hiddenIds.has(answer.id) &&
          !(answer.author_hash && blockedAuthors.has(answer.author_hash)),
      ),
    [answers, hiddenIds, blockedAuthors],
  );

  return {
    answers: visibleAnswers,
    likedIds,
    myAnswerId,
    toggleLike,
    report,
    blockAuthor,
    blockedAuthors,
    loading,
    error,
    refetch,
  };
}
