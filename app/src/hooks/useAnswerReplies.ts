import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ZodiacSign } from '@/src/constants/zodiac';
import {
  addHiddenReplyId,
  getHiddenReplyIds,
  removeHiddenReplyId,
  type ReportReason,
} from '@/src/lib/moderation';
import {
  deletePublicReply,
  fetchMyLikedReplyIds,
  fetchMyReplyIds,
  fetchRepliesForAnswers,
  reportReply as reportReplyRemote,
  toggleReplyLike as toggleReplyLikeRemote,
  upsertPublicReply,
  type PublicReply,
  type ReportResult,
} from '@/src/lib/supabase';

type UseAnswerRepliesResult = {
  /** answer_id → 이 기기에 보이는 답글, 오래된 순. 차단·숨김 필터를 거친 결과다. */
  repliesByAnswer: Map<string, PublicReply[]>;
  likedReplyIds: Set<string>;
  /** answer_id → 내 답글 id. 자동 숨김된 것도 포함한다(작성창 재노출 = 숨김 우회 방지). */
  myReplyIdByAnswer: Map<string, string>;
  /**
   * 첫 조회가 끝났는지. 로딩 중에도 직전 데이터는 그대로 들고 있으므로,
   * 배지 숫자를 감출지 판단할 때는 loading이 아니라 이 값을 봐야 한다
   * (loading으로 판단하면 당겨서 새로고침할 때마다 숫자가 사라졌다 돌아온다).
   */
  loaded: boolean;
  loading: boolean;
  /** 작성·수정 공용. 성공하면 목록에 즉시 반영된다(refetch 없음). */
  saveReply: (answerId: string, body: string) => Promise<boolean>;
  deleteReply: (replyId: string) => Promise<boolean>;
  toggleReplyLike: (replyId: string) => void;
  reportReply: (replyId: string, reason: ReportReason) => Promise<ReportResult>;
  refetch: () => void;
};

/**
 * 피드에 보이는 답변들의 답글을 하루치 한 번에 받아 관리한다.
 *
 * 답변별로 따로 조회하지 않는 이유: 피드가 무페이지네이션이라 답변 id 목록이 이미 전부 손에 있고,
 * 배지("답글 N")와 목록을 같은 배열에서 뽑아야 둘이 어긋나지 않는다. 서버가 세어준 숫자를 쓰면
 * 차단·로컬 숨김을 반영할 수 없어 "답글 3"인데 펼치면 한 줄만 나오는 상태가 된다.
 *
 * blockedAuthors는 useAnswerFeed에서 받아온다 — 여기서 따로 읽으면 두 목록이 서로 다른 Set을 보게 된다.
 */
export function useAnswerReplies(
  answerIds: string[],
  deviceId: string | null,
  zodiacSign: ZodiacSign | null,
  blockedAuthors: Set<string>,
): UseAnswerRepliesResult {
  // 그룹핑된 Map이 아니라 평면 배열로 들고 있는다. 낙관적 갱신이 useAnswerFeed와
  // 글자 그대로 같은 setReplies(prev => prev.map(...)) 형태가 되기 때문이다.
  const [replies, setReplies] = useState<PublicReply[]>([]);
  const [likedReplyIds, setLikedReplyIds] = useState<Set<string>>(new Set());
  const [myReplyIdByAnswer, setMyReplyIdByAnswer] = useState<Map<string, string>>(new Map());
  const [hiddenReplyIds, setHiddenReplyIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  // answerIds는 매 렌더 새 배열이고, 원본인 useAnswerFeed.answers도 필터 결과 useMemo라
  // 차단/숨김이 바뀔 때마다 참조가 달라진다. 그대로 deps에 넣으면 무한 refetch가 된다.
  const idsKey = answerIds.join(',');
  const answerIdsRef = useRef(answerIds);
  answerIdsRef.current = answerIds;

  useEffect(() => {
    let cancelled = false;
    getHiddenReplyIds().then((hidden) => {
      if (!cancelled) setHiddenReplyIds(hidden);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ids = answerIdsRef.current;

    if (!deviceId || ids.length === 0) {
      setReplies([]);
      setLikedReplyIds(new Set());
      setMyReplyIdByAnswer(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const [list, mine] = await Promise.all([
        fetchRepliesForAnswers(ids),
        fetchMyReplyIds(ids, deviceId),
      ]);
      if (cancelled) return;
      setReplies(list);
      setMyReplyIdByAnswer(mine);

      const liked = await fetchMyLikedReplyIds(
        list.map((r) => r.id),
        deviceId,
      );
      if (cancelled) return;
      setLikedReplyIds(liked);
      setLoaded(true);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey, deviceId, reloadTick]);

  /**
   * 작성·수정 공용. 일부러 낙관적으로 처리하지 않는다 —
   * id · created_at · author_hash가 전부 서버 생성이고, 공감·삭제·수정기한 판정에 즉시 필요하다.
   * 임시 id를 발급해 나중에 맞추는 쪽이 코드도 실패 모드도 더 많다.
   */
  const saveReply = useCallback(
    async (answerId: string, body: string): Promise<boolean> => {
      const trimmed = body.trim();
      if (!deviceId || !zodiacSign || trimmed.length === 0) return false;

      const saved = await upsertPublicReply(answerId, deviceId, zodiacSign, trimmed);
      if (!saved) return false;

      setReplies((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx === -1) return [...prev, saved];
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
      setMyReplyIdByAnswer((prev) => new Map(prev).set(answerId, saved.id));
      return true;
    },
    [deviceId, zodiacSign],
  );

  /** 낙관적으로 지우고, 실패하면 원래 자리에 되돌린다. */
  const deleteReply = useCallback(
    async (replyId: string): Promise<boolean> => {
      if (!deviceId) return false;

      const removed = replies.find((r) => r.id === replyId);
      if (!removed) return false;

      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setMyReplyIdByAnswer((prev) => {
        const next = new Map(prev);
        next.delete(removed.answer_id);
        return next;
      });

      const ok = await deletePublicReply(replyId, deviceId);
      if (ok) return true;

      setReplies((prev) =>
        [...prev, removed].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      );
      setMyReplyIdByAnswer((prev) => new Map(prev).set(removed.answer_id, removed.id));
      return false;
    },
    [deviceId, replies],
  );

  const toggleReplyLike = useCallback(
    (replyId: string) => {
      if (!deviceId) return;

      const wasLiked = likedReplyIds.has(replyId);
      const nextLiked = !wasLiked;

      setLikedReplyIds((prev) => {
        const next = new Set(prev);
        if (nextLiked) next.add(replyId);
        else next.delete(replyId);
        return next;
      });
      setReplies((prev) =>
        prev.map((r) =>
          r.id === replyId ? { ...r, like_count: r.like_count + (nextLiked ? 1 : -1) } : r,
        ),
      );

      toggleReplyLikeRemote(replyId, deviceId, nextLiked).then((ok) => {
        if (ok) return;
        // 실패 시 롤백
        setLikedReplyIds((prev) => {
          const next = new Set(prev);
          if (nextLiked) next.delete(replyId);
          else next.add(replyId);
          return next;
        });
        setReplies((prev) =>
          prev.map((r) =>
            r.id === replyId ? { ...r, like_count: r.like_count + (nextLiked ? -1 : 1) } : r,
          ),
        );
      });
    },
    [deviceId, likedReplyIds],
  );

  /**
   * 낙관적으로 먼저 숨기고, 서버 전송이 실패하면 되돌린다.
   *
   * 실패해도 숨긴 채로 두면 사용자는 신고가 접수됐다고 믿는데 서버에는 아무것도 남지 않아
   * 그 답글이 영영 검토되지 않는다. "그냥 안 보고 싶다"는 요구는 차단(로컬 전용이라 항상 성공)이 담당한다.
   */
  const reportReply = useCallback(
    async (replyId: string, reason: ReportReason): Promise<ReportResult> => {
      setHiddenReplyIds((prev) => new Set(prev).add(replyId));
      await addHiddenReplyId(replyId);

      const result: ReportResult = deviceId
        ? await reportReplyRemote(replyId, deviceId, reason)
        : { ok: false, error: 'device_id 없음 — 신고 요청을 보내지 않았습니다' };

      if (result.ok) return result;

      setHiddenReplyIds((prev) => {
        const next = new Set(prev);
        next.delete(replyId);
        return next;
      });
      await removeHiddenReplyId(replyId);
      return result;
    },
    [deviceId],
  );

  const repliesByAnswer = useMemo(() => {
    const map = new Map<string, PublicReply[]>();
    for (const reply of replies) {
      if (hiddenReplyIds.has(reply.id)) continue;
      // author_hash가 비어 있으면 차단 검사를 건너뛴다 — Set에 빈 값이 섞여 있으면
      // author_hash 없는 답글이 한꺼번에 사라진다 (useAnswerFeed와 같은 가드).
      if (reply.author_hash && blockedAuthors.has(reply.author_hash)) continue;

      const list = map.get(reply.answer_id);
      if (list) list.push(reply);
      else map.set(reply.answer_id, [reply]);
    }
    return map;
  }, [replies, hiddenReplyIds, blockedAuthors]);

  return {
    repliesByAnswer,
    likedReplyIds,
    myReplyIdByAnswer,
    loaded,
    loading,
    saveReply,
    deleteReply,
    toggleReplyLike,
    reportReply,
    refetch,
  };
}
