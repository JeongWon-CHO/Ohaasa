import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { colors, radius, shadows, spacing, zodiacColors } from '@/src/constants/design';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import type { PublicAnswer } from '@/src/lib/supabase';

interface AnswerCardProps {
  answer: PublicAnswer;
  isMine: boolean;
  liked: boolean;
  onToggleLike: () => void;
  /** 신고·차단 메뉴 열기. 내 글에는 표시하지 않는다. */
  onOpenModeration: () => void;
  /** 답글 수. null이면 아직 로딩 중이라 숫자 없이 "답글"만 보여준다(숫자가 튀는 것 방지). */
  replyCount: number | null;
  repliesExpanded: boolean;
  onToggleReplies: () => void;
  /** 펼쳤을 때 카드 테두리 안쪽에 렌더링되는 답글 영역(ReplyThread). */
  children?: ReactNode;
}

export function AnswerCard({
  answer,
  isMine,
  liked,
  onToggleLike,
  onOpenModeration,
  replyCount,
  repliesExpanded,
  onToggleReplies,
  children,
}: AnswerCardProps) {
  const zodiac = ZODIAC_MAP[answer.zodiac_sign];

  return (
    <View style={[styles.card, shadows.card, isMine && styles.cardMine]}>
      <View style={styles.header}>
        <View
          style={[styles.badgeWrap, { backgroundColor: `${zodiacColors[answer.zodiac_sign]}66` }]}
        >
          <ConstellationBadge sign={answer.zodiac_sign} size={28} />
        </View>
        <Text style={styles.zodiacName}>{zodiac.ko}</Text>
        <View style={styles.headerActions}>
          {isMine && (
            <View style={styles.mineChip}>
              <Text style={styles.mineChipText}>내 글</Text>
            </View>
          )}
          <Pressable
            onPress={onToggleLike}
            hitSlop={8}
            style={({ pressed }) => [styles.likeBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`공감 ${answer.like_count}개`}
          >
            <Feather
              name="thumbs-up"
              size={14}
              color={liked ? colors.apricotDark : colors.textSoft}
            />
            <Text style={[styles.likeCount, liked && styles.likeCountActive]}>
              {answer.like_count}
            </Text>
          </Pressable>

          {!isMine && (
            <Pressable
              onPress={onOpenModeration}
              hitSlop={8}
              style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="신고 및 차단"
            >
              <Feather name="more-horizontal" size={16} color={colors.textSoft} />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.body}>{answer.body}</Text>

      {/* 답글이 0개여도 보여준다 — 첫 답글을 유도하는 어포던스이기 때문이다. */}
      <View style={styles.replySection}>
        <Pressable
          onPress={onToggleReplies}
          hitSlop={8}
          style={({ pressed }) => [styles.replyToggle, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityState={{ expanded: repliesExpanded }}
          accessibilityLabel={replyCount === null ? '답글 보기' : `답글 ${replyCount}개 보기`}
        >
          <Feather name="message-circle" size={13} color={colors.textSoft} />
          <Text style={styles.replyLabel}>
            {replyCount === null ? '답글' : `답글 ${replyCount}`}
          </Text>
          <Feather
            name={repliesExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textSoft}
          />
        </Pressable>

        {repliesExpanded && children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.cardSolid,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardMine: {
    borderColor: colors.apricot,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zodiacName: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
    lineHeight: 18,
  },
  headerActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mineChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(240,184,154,0.18)',
  },
  mineChipText: {
    fontSize: 10,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.apricotDark,
    lineHeight: 15,
  },
  body: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    lineHeight: 21,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  moreBtn: {
    paddingLeft: 2,
  },
  likeCount: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
  },
  likeCountActive: {
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.apricotDark,
  },
  replySection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  replyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  replyLabel: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
  },
});
