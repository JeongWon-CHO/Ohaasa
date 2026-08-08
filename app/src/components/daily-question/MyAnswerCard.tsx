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
      </View>

      <Text style={styles.body}>{answer.body}</Text>

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.72 }]}
        >
          <Text style={styles.actionText}>수정하기</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.72 }]}
        >
          <Text style={[styles.actionText, styles.deleteText]}>삭제하기</Text>
        </Pressable>
      </View>
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.cream3,
    backgroundColor: colors.cardSolid,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
    lineHeight: 18,
  },
  deleteText: {
    color: colors.trendDown,
  },
});
