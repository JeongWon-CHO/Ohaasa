import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/src/constants/design';
import type { QuestionAnswer } from '@/src/lib/questionAnswers';

interface MyAnswerCardProps {
  answer: QuestionAnswer;
  onEdit: () => void;
  onDelete: () => void;
}

export function MyAnswerCard({ answer, onEdit, onDelete }: MyAnswerCardProps) {
  const isPublic = answer.visibility === 'public';

  return (
    <View style={[styles.card, shadows.card]}>
      <View style={styles.header}>
        <Text style={styles.label}>내 답변</Text>
        <View style={[styles.chip, isPublic && styles.chipActive]}>
          <Text style={[styles.chipText, isPublic && styles.chipTextActive]}>
            {isPublic ? '공개' : '비공개'}
          </Text>
        </View>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.64 }]}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="내 답변 수정하기"
        >
          <Feather name="edit-2" size={16} color={colors.textMid} />
        </Pressable>
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
});
