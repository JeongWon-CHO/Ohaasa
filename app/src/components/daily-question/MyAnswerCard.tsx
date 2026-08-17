import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/src/constants/design';
import { canEditAnswer, type QuestionAnswer } from '@/src/lib/questionAnswers';

interface MyAnswerCardProps {
  answer: QuestionAnswer;
  onEdit: () => void;
  onDelete: () => void;
  /**
   * 서버에 미러링된 행의 공감 수. 비공개 답변이거나 별자리 필터에 걸려 그 행을 못 받아온
   * 경우 null이고, 그때는 숫자를 아예 감춘다(0으로 보이면 공감이 없다는 오해가 된다).
   */
  likeCount?: number | null;
  /**
   * 답글 영역. 공개 답변일 때만 넘어온다 — 비공개 답변은 서버에 행 자체가 없어 답글이 달릴 수 없다.
   * 값 하나로 묶어 둔 이유: 전부 있거나 전부 없거나이므로 타입이 그걸 강제하게 한다.
   */
  replies?: {
    /** null이면 아직 로딩 중이라 숫자 없이 "답글"만 보여준다(AnswerCard와 같은 규칙). */
    count: number | null;
    /** 마지막으로 펼쳐 본 뒤에 달린 남의 답글 수. 0이면 배지를 숨긴다. */
    newCount: number;
    expanded: boolean;
    onToggle: () => void;
    thread: ReactNode;
  };
}

/**
 * 커뮤니티 피드 맨 위에 고정되는 내 답변 카드.
 *
 * 본문·공개여부·수정가능 판정은 로컬(AsyncStorage)이 source of truth지만, 공감 수와 답글은
 * 서버에서 온다. 피드 목록에는 이 답변을 넣지 않는다 — 같은 글이 두 번 나오는 데다,
 * 정작 답글이 달린 쪽이 스크롤해야 나오는 쪽이 되어버린다.
 */
export function MyAnswerCard({
  answer,
  onEdit,
  onDelete,
  likeCount = null,
  replies,
}: MyAnswerCardProps) {
  const isPublic = answer.visibility === 'public';
  const editable = canEditAnswer(answer);

  return (
    <View style={[styles.card, shadows.card]}>
      <View style={styles.header}>
        <Text style={styles.label}>내 답변</Text>
        <View style={[styles.chip, isPublic && styles.chipActive]}>
          <Text style={[styles.chipText, isPublic && styles.chipTextActive]}>
            {isPublic ? '공개' : '비공개'}
          </Text>
        </View>
        {editable && (
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.64 }]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="내 답변 수정하기"
          >
            <Feather name="edit-2" size={16} color={colors.textMid} />
          </Pressable>
        )}
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.64 }]}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="내 답변 삭제하기"
        >
          <Feather name="trash-2" size={16} color={colors.trendDown} />
        </Pressable>
      </View>

      <Text style={styles.body}>{answer.body}</Text>

      {replies && (
        <View style={styles.replySection}>
          <View style={styles.replyRow}>
            <Pressable
              onPress={replies.onToggle}
              hitSlop={8}
              style={({ pressed }) => [styles.replyToggle, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityState={{ expanded: replies.expanded }}
              accessibilityLabel={
                replies.count === null
                  ? '내 답변의 답글 보기'
                  : `내 답변의 답글 ${replies.count}개 보기${
                      replies.newCount > 0 ? `, 새 답글 ${replies.newCount}개` : ''
                    }`
              }
            >
              <Feather name="message-circle" size={13} color={colors.apricotDark} />
              <Text style={styles.replyLabel}>
                {replies.count === null ? '답글' : `답글 ${replies.count}`}
              </Text>
              {replies.newCount > 0 && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>새 답글 {replies.newCount}</Text>
                </View>
              )}
              <Feather
                name={replies.expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.apricotDark}
              />
            </Pressable>

            {likeCount !== null && (
              <View style={styles.likeInfo} accessibilityLabel={`공감 ${likeCount}개`}>
                <Feather name="thumbs-up" size={13} color={colors.textSoft} />
                <Text style={styles.likeCount}>{likeCount}</Text>
              </View>
            )}
          </View>

          {replies.expanded && replies.thread}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.apricot,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(240,184,154,0.1)',
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.apricotDark,
    lineHeight: 18,
  },
  chip: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cream3,
    backgroundColor: colors.cardSolid,
  },
  chipActive: {
    borderColor: colors.apricot,
    backgroundColor: 'rgba(240,184,154,0.22)',
  },
  chipText: {
    fontSize: 10,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textSoft,
    lineHeight: 15,
  },
  chipTextActive: {
    color: colors.apricotDark,
  },
  body: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    lineHeight: 21,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cream3,
    backgroundColor: colors.cardSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySection: {
    borderTopWidth: 1,
    borderTopColor: colors.apricot,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // AnswerCard의 같은 줄보다 한 톤 진하게 둔다 — 여기가 "내 글에 온 반응"을 확인하는 자리다.
  replyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  replyLabel: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.apricotDark,
    lineHeight: 18,
  },
  newBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.apricotDark,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: 'NotoSansKR_600SemiBold',
    color: '#FFFDF5',
    lineHeight: 15,
  },
  likeInfo: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  likeCount: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
  },
});
