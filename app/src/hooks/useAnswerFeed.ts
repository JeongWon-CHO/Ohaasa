import { useCallback, useEffect, useState } from 'react';

import type { ZodiacSign } from '@/src/constants/zodiac';
import {
  fetchMyAnswerId,
  fetchMyLikedAnswerIds,
  fetchPublicAnswers,
  toggleAnswerLike,
  type PublicAnswer,
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

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  useEffect(() => {
    if (!date || !deviceId) {
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

  return { answers, likedIds, myAnswerId, toggleLike, loading, error, refetch };
}
