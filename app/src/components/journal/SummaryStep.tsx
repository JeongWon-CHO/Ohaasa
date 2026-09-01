import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/src/constants/design';

/** 제목처럼 쓰는 한 줄이라 짧게 잡는다. 길면 달력·카드에서 잘린다. */
export const MAX_SUMMARY = 30;

interface SummaryStepProps {
  summary: string;
  onChange: (summary: string) => void;
  onFocus?: () => void;
}

export function SummaryStep({ summary, onChange, onFocus }: SummaryStepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>마지막으로,{'\n'}오늘을 한마디로 남겨볼까요?</Text>

      <View style={styles.inputWrap}>
        <TextInput
          value={summary}
          onChangeText={(v) => onChange(v.slice(0, MAX_SUMMARY))}
          onFocus={onFocus}
          placeholder="생각보다 괜찮았던 하루"
          placeholderTextColor={colors.textSoft}
          style={styles.input}
          maxLength={MAX_SUMMARY}
          returnKeyType="done"
        />
        <Text style={styles.counter}>
          {summary.length} / {MAX_SUMMARY}
        </Text>
      </View>

      {/* 강제하지 않는다 — 매일 쓰는 것이라 한 칸이라도 의무가 되면 부담이 된다. */}
      <Text style={styles.hint}>비워두셔도 괜찮아요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xxl,
  },
  question: {
    fontSize: 19,
    lineHeight: 30,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    textAlign: 'center',
  },
  inputWrap: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  input: {
    backgroundColor: colors.cardSolid,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    // 한 줄짜리 입력인데 칸이 작으면 화면이 텅 비어 보인다.
    // 높이를 주고 글자를 가운데에 두어 카드처럼 만든다.
    minHeight: 132,
    fontSize: 19,
    lineHeight: 28,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
});
