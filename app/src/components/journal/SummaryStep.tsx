import {
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors, layout, radius, spacing } from '@/src/constants/design';

/** 제목처럼 쓰는 한 줄이라 짧게 잡는다. 길면 달력·카드에서 잘린다. */
export const MAX_SUMMARY = 30;

interface SummaryStepProps {
  summary: string;
  onChange: (summary: string) => void;
  onFocus?: () => void;
}

export function SummaryStep({ summary, onChange, onFocus }: SummaryStepProps) {
  const { width } = useWindowDimensions();
  const memoSize = Math.min(width, layout.maxContentWidth) - spacing.xl * 2;

  return (
    <View style={styles.container}>
      {/* 질문은 왼쪽 정렬 두 줄 — 가운데 정렬하면 아래 메모지와 축이 겹쳐 답답하다. */}
      <Text style={styles.question}>
        마지막으로,{'\n'}오늘을 한마디로 남겨볼까요?
      </Text>

      <ImageBackground
        source={require('@/assets/images/background.png')}
        style={[styles.memo, { width: memoSize, height: memoSize }]}
        imageStyle={styles.memoImage}
        resizeMode="cover"
      >
        <TextInput
          value={summary}
          onChangeText={(v) => onChange(v.slice(0, MAX_SUMMARY))}
          onFocus={onFocus}
          placeholder="생각보다 괜찮았던 하루"
          placeholderTextColor="rgba(90,70,54,0.4)"
          style={styles.input}
          maxLength={MAX_SUMMARY}
          returnKeyType="done"
          multiline
          textAlign="center"
        />
      </ImageBackground>

      <View style={styles.meta}>
        {/* 강제하지 않는다 — 매일 쓰는 것이라 한 칸이라도 의무가 되면 부담이 된다. */}
        <Text style={styles.hint}>비워두셔도 괜찮아요</Text>
        <Text style={styles.counter}>
          {summary.length} / {MAX_SUMMARY}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.lg,
  },
  question: {
    fontSize: 19,
    lineHeight: 30,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
  },
  memo: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  memoImage: {
    borderRadius: radius.lg,
  },
  input: {
    fontSize: 19,
    lineHeight: 29,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.ink,
    padding: 0,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hint: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  counter: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
});
