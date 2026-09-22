import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ReplyComposer } from '@/src/components/daily-question/ReplyComposer';
import { ReplyItem } from '@/src/components/daily-question/ReplyItem';
import { colors, radius, spacing } from '@/src/constants/design';
import { canEditByCreatedAt } from '@ohaasa/shared/lib/questionAnswers';
import type { PublicReply } from '@ohaasa/shared/lib/supabase';

interface ReplyThreadProps {
  replies: PublicReply[];
  likedReplyIds: Set<string>;
  /** 이 답변에 남긴 내 답글 id. 자동 숨김돼 replies에 없을 수도 있다. */
  myReplyId: string | null;
  /** 답글은 공개 데이터라 별자리가 설정돼 있어야 작성할 수 있다. */
  canWrite: boolean;
  onToggleLike: (replyId: string) => void;
  onOpenModeration: (reply: PublicReply) => void;
  onSave: (body: string) => Promise<boolean>;
  /** 확인 다이얼로그는 화면 루트에서 띄운다 (BottomSheet 위 Modal 중첩 금지 규칙). */
  onRequestDelete: (replyId: string) => void;
  onComposerFocusBottom?: (bottomInWindow: number) => void;
}

export function ReplyThread({
  replies,
  likedReplyIds,
  myReplyId,
  canWrite,
  onToggleLike,
  onOpenModeration,
  onSave,
  onRequestDelete,
  onComposerFocusBottom,
}: ReplyThreadProps) {
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editingReply = editingReplyId
    ? replies.find((r) => r.id === editingReplyId)
    : undefined;
  // 내 답글이 이미 목록에 있으면 거기 수정·삭제 아이콘이 있으므로 작성창을 또 띄우지 않는다.
  const showComposer = myReplyId === null || editingReplyId !== null;
  // 내 답글이 신고 임계값에 걸려 서버에서 숨겨진 상태. 작성창은 열어주지 않고(우회 작성 방지)
  // 삭제 경로만 남긴다 — 없으면 본인이 자기 글을 내릴 방법이 사라진다.
  const myReplyHidden =
    myReplyId !== null && !replies.some((r) => r.id === myReplyId);

  async function handleSubmit(body: string) {
    setSubmitting(true);
    const ok = await onSave(body);
    setSubmitting(false);
    if (ok) setEditingReplyId(null);
  }

  return (
    <View style={styles.thread}>
      {replies.length === 0 ? (
        <Text style={styles.empty}>첫 답글을 남겨보세요</Text>
      ) : (
        <View style={styles.list}>
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              isMine={reply.id === myReplyId}
              liked={likedReplyIds.has(reply.id)}
              editable={
                canWrite &&
                reply.id === myReplyId &&
                canEditByCreatedAt(reply.created_at)
              }
              onToggleLike={() => onToggleLike(reply.id)}
              onOpenModeration={() => onOpenModeration(reply)}
              onEdit={() => setEditingReplyId(reply.id)}
              onDelete={() => onRequestDelete(reply.id)}
            />
          ))}
        </View>
      )}

      {myReplyHidden && (
        <View style={styles.hiddenNotice}>
          <Text style={styles.hiddenText}>
            신고가 누적되어 내 답글이 숨겨졌어요
          </Text>
          <Pressable
            onPress={() => onRequestDelete(myReplyId)}
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
            accessibilityRole="button"
          >
            <Text style={styles.hiddenAction}>삭제</Text>
          </Pressable>
        </View>
      )}

      {!canWrite ? (
        <View style={styles.zodiacRequiredNotice}>
          <Text style={styles.zodiacRequiredText}>
            답글을 달려면 별자리를 설정해 주세요.
          </Text>
        </View>
      ) : (
        showComposer && (
          <ReplyComposer
            // 신규 작성 ↔ 수정을 오갈 때 초기값을 다시 넣으려면 리마운트가 필요하다.
            key={editingReplyId ?? 'new'}
            initialBody={editingReply?.body ?? ''}
            editing={editingReplyId !== null}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancelEdit={() => setEditingReplyId(null)}
            onFocusBottom={onComposerFocusBottom}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  empty: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 17,
  },
  zodiacRequiredNotice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  zodiacRequiredText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
    textAlign: 'center',
  },
  hiddenNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hiddenText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 17,
  },
  hiddenAction: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.trendDown,
    lineHeight: 17,
  },
});
