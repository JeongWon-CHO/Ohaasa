import { Feather } from '@expo/vector-icons';
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
}

export function AnswerCard({ answer, isMine, liked, onToggleLike }: AnswerCardProps) {
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
        {isMine && (
          <View style={styles.mineChip}>
            <Text style={styles.mineChipText}>내 글</Text>
          </View>
        )}
      </View>

      <Text style={styles.body}>{answer.body}</Text>

      <View style={styles.footer}>
        <Pressable
          onPress={onToggleLike}
          hitSlop={8}
          style={({ pressed }) => [styles.likeBtn, pressed && { opacity: 0.7 }]}
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
  mineChip: {
    marginLeft: 'auto',
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  likeBtn: {
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
  likeCountActive: {
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.apricotDark,
  },
});
