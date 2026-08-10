import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/constants/design';
import { COMMUNITY_GUIDELINES_URL } from '@/src/constants/links';

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
        <View style={styles.inputFooter}>
          <Pressable
            onPress={() => onChangeIsPublic(!isPublic)}
            style={({ pressed }) => [styles.visibilityRow, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            accessibilityRole="radio"
            accessibilityState={{ checked: !isPublic }}
          >
            <View style={[styles.radio, !isPublic && styles.radioSelected]}>
              {!isPublic && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.visibilityLabel}>나만 보기</Text>
          </Pressable>

          <Text style={styles.counter}>
            {body.length} / {MAX_LENGTH}
          </Text>
        </View>
      </View>

      {/*
        App Store 심사 지침 1.2(UGC)는 공개 게시 전에 불쾌한 콘텐츠 무관용 정책에 대한
        동의 절차를 요구한다. 기본값이 '공개'이므로 이 고지는 별도 조작 없이 노출된다.
      */}
      {isPublic && (
        <Pressable
          onPress={() => Linking.openURL(COMMUNITY_GUIDELINES_URL)}
          accessibilityRole="link"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text style={styles.notice}>
            공개한 답변은 다른 사용자에게 보여요. 공개하면{' '}
            <Text style={styles.noticeLink}>커뮤니티 가이드라인</Text>에 동의하는 것으로
            간주되며, 욕설·괴롭힘 등 불쾌한 콘텐츠는 무관용 정책에 따라 24시간 이내에 삭제돼요.
          </Text>
        </Pressable>
      )}
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
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.apricotDark,
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.apricotDark,
  },
  visibilityLabel: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
  },
  notice: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 17,
    marginTop: -spacing.sm,
  },
  noticeLink: {
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.apricotDark,
    textDecorationLine: 'underline',
  },
});
