import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { colors, spacing, zodiacColors } from '@/src/constants/design';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import type { PublicReply } from '@/src/lib/supabase';

interface ReplyItemProps {
  reply: PublicReply;
  isMine: boolean;
  liked: boolean;
  /** isMine && canEditByCreatedAt(reply.created_at) — 올린 날이 지나면 삭제만 남는다. */
  editable: boolean;
  onToggleLike: () => void;
  /** 신고·차단 메뉴 열기. 내 답글에는 표시하지 않는다. */
  onOpenModeration: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ReplyItem({
  reply,
  isMine,
  liked,
  editable,
  onToggleLike,
  onOpenModeration,
  onEdit,
  onDelete,
}: ReplyItemProps) {
  const zodiac = ZODIAC_MAP[reply.zodiac_sign];

  return (
    <View style={styles.item}>
      <View style={styles.header}>
        <View
          style={[styles.badgeWrap, { backgroundColor: `${zodiacColors[reply.zodiac_sign]}66` }]}
        >
          <ConstellationBadge sign={reply.zodiac_sign} size={20} />
        </View>
        <Text style={styles.zodiacName}>{zodiac.ko}</Text>

        <View style={styles.actions}>
          <Pressable
            onPress={onToggleLike}
            hitSlop={8}
            style={({ pressed }) => [styles.likeBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`공감 ${reply.like_count}개`}
          >
            <Feather name="thumbs-up" size={13} color={liked ? colors.apricotDark : colors.textSoft} />
            <Text style={[styles.likeCount, liked && styles.likeCountActive]}>
              {reply.like_count}
            </Text>
          </Pressable>

          {isMine ? (
            <>
              {editable && (
                <Pressable
                  onPress={onEdit}
                  hitSlop={8}
                  style={({ pressed }) => pressed && { opacity: 0.64 }}
                  accessibilityRole="button"
                  accessibilityLabel="내 답글 수정하기"
                >
                  {/* 공감 아이콘(미선택)과 같은 톤. 한 줄 안에서 아이콘 무게가 들쭉날쭉하지 않게 맞춘다. */}
                  <Feather name="edit-2" size={14} color={colors.textSoft} />
                </Pressable>
              )}
              <Pressable
                onPress={onDelete}
                hitSlop={8}
                style={({ pressed }) => pressed && { opacity: 0.64 }}
                accessibilityRole="button"
                accessibilityLabel="내 답글 삭제하기"
              >
                <Feather name="trash-2" size={14} color={colors.trendDown} />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={onOpenModeration}
              hitSlop={8}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
              accessibilityRole="button"
              accessibilityLabel="신고 및 차단"
            >
              <Feather name="more-horizontal" size={15} color={colors.textSoft} />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.body}>{reply.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    // 왼쪽 세로선으로 원글에 딸린 글임을 표시한다.
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.cream3,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zodiacName: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
    lineHeight: 17,
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 17,
  },
  likeCountActive: {
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.apricotDark,
  },
  body: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    lineHeight: 20,
  },
});
