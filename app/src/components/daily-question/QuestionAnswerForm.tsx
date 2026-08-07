import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Toggle } from '@/src/components/final/Toggle';
import { colors, radius, spacing, typography } from '@/src/constants/design';

const MAX_LENGTH = 120;

interface QuestionAnswerFormProps {
  questionText: string;
  body: string;
  onChangeBody: (body: string) => void;
  isPublic: boolean;
  onChangeIsPublic: (isPublic: boolean) => void;
}

export function QuestionAnswerForm({
  questionText,
  body,
  onChangeBody,
  isPublic,
  onChangeIsPublic,
}: QuestionAnswerFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{questionText}</Text>

      <View style={styles.inputWrap}>
        <TextInput
          value={body}
          onChangeText={(text) => onChangeBody(text.slice(0, MAX_LENGTH))}
          placeholder="떠오르는 생각을 편하게 적어보세요"
          placeholderTextColor={colors.textSoft}
          style={styles.input}
          multiline
          maxLength={MAX_LENGTH}
        />
        <Text style={styles.counter}>
          {body.length} / {MAX_LENGTH}
        </Text>
      </View>

      <View style={styles.visibilityRow}>
        <View style={styles.visibilityTextWrap}>
          <Text style={styles.visibilityTitle}>
            {isPublic ? '다른 사람에게도 보여주기' : '나만 보기'}
          </Text>
          <Text style={styles.visibilitySubtitle}>
            {isPublic
              ? '익명으로 커뮤니티에 공개돼요'
              : '비공개로 남기면 나만 볼 수 있어요'}
          </Text>
        </View>
        <Toggle value={isPublic} onChange={onChangeIsPublic} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  question: {
    ...typography.sectionTitle,
    fontSize: 18,
    lineHeight: 27,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.cardSolid,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    minHeight: 96,
    fontSize: 14,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.cardSolid,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  visibilityTextWrap: {
    flex: 1,
    gap: 2,
  },
  visibilityTitle: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
    lineHeight: 19,
  },
  visibilitySubtitle: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 17,
  },
});
