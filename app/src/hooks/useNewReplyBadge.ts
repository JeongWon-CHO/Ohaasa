import { useEffect, useMemo, useState } from 'react';

import { getReplySeenAt, setReplySeenAt } from '@/src/lib/replySeen';
import type { PublicReply } from '@/src/lib/supabase';

type UseNewReplyBadgeParams = {
  /** 배지를 붙일 답변. 비공개 답변(서버 행 없음)이면 null. */
  answerId: string | null;
  /** 이 기기에 실제로 보이는 답글. 차단·숨김 필터를 이미 거친 배열이어야 한다. */
  replies: PublicReply[];
  /** 이 답변에 남긴 내 답글 id. 내가 쓴 건 "새 답글"이 아니다. */
  myReplyId: string | null;
  expanded: boolean;
  /** 답글 첫 조회가 끝났는지(useAnswerReplies.loaded). 로딩 중에 0을 세어 읽음 처리하는 걸 막는다. */
  loaded: boolean;
};

/**
 * "마지막으로 펼쳐 본 뒤에 달린 남의 답글" 개수.
 *
 * 읽음 처리를 펼치는 순간의 이벤트가 아니라 "펼쳐져 있는 동안"의 상태로 잡는다 —
 * 당겨서 새로고침으로 답글이 들어오는 경로가 있어서, 펼침 이벤트에만 걸면 이미 화면에
 * 보이고 있는 답글에 배지가 다시 붙는다.
 *
 * 기록이 없으면(seenAt === null) 전부 새 답글로 센다. 이 기능이 없던 시절에 이미 읽은
 * 답글이 한 번 새것으로 보일 수 있지만, 반대로 처음 달린 답글을 놓치는 쪽이 나쁘다.
 */
export function useNewReplyBadge({
  answerId,
  replies,
  myReplyId,
  expanded,
  loaded,
}: UseNewReplyBadgeParams): number {
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [seenLoaded, setSeenLoaded] = useState(false);

  useEffect(() => {
    if (!answerId) {
      setSeenAt(null);
      setSeenLoaded(false);
      return;
    }

    let cancelled = false;
    setSeenLoaded(false);
    getReplySeenAt(answerId).then((value) => {
      if (cancelled) return;
      setSeenAt(value);
      setSeenLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [answerId]);

  const latestCreatedAt = useMemo(
    () =>
      replies.reduce<string | null>(
        (max, reply) => (max === null || reply.created_at > max ? reply.created_at : max),
        null,
      ),
    [replies],
  );

  useEffect(() => {
    if (!expanded || !answerId || !loaded || !seenLoaded) return;
    if (latestCreatedAt === null) return;
    if (seenAt !== null && seenAt >= latestCreatedAt) return;

    setSeenAt(latestCreatedAt);
    void setReplySeenAt(answerId, latestCreatedAt);
  }, [expanded, answerId, loaded, seenLoaded, latestCreatedAt, seenAt]);

  if (!answerId || !loaded || !seenLoaded) return 0;

  return replies.filter(
    (reply) => reply.id !== myReplyId && (seenAt === null || reply.created_at > seenAt),
  ).length;
}
