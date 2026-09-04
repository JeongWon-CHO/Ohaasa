import {
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors, layout, spacing } from '@/src/constants/design';

/** 제목처럼 쓰는 한 줄이라 짧게 잡는다. 길면 달력·카드에서 잘린다. */
export const MAX_SUMMARY = 30;

const LINE_HEIGHT = 29;
const SIDE_PADDING = 28;

/**
 * 30자면 가운데 정렬로 두 줄이면 넉넉하다. 한 줄을 더 깔아 두는 건
 * 마지막 줄에 걸쳐 썼을 때 밑줄이 없어 허전해 보이지 않게 하기 위함.
 */
const RULE_COUNT = 3;

interface SummaryStepProps {
  summary: string;
  onChange: (summary: string) => void;
  onFocus?: () => void;
}

export function SummaryStep({ summary, onChange, onFocus }: SummaryStepProps) {
  const { width } = useWindowDimensions();
  const memoWidth = Math.min(width, layout.maxContentWidth) - spacing.xl * 2;
  const memoHeight = RULE_COUNT * LINE_HEIGHT;

  return (
    <View style={styles.container}>
      {/* 메모지 그림이 빠지면서 축을 나눌 상대가 없어졌다 — 줄과 같은 가운데로 맞춘다. */}
      <Text style={styles.question}>
        마지막으로,{'\n'}오늘을 한마디로 남겨볼까요?
      </Text>

      <View style={[styles.memo, { width: memoWidth, height: memoHeight }]}>
        {/* 밑줄은 글자 줄 아래에 놓는다 — 줄 상자의 바닥이라 글자와 겹치지 않는다. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: RULE_COUNT }, (_, i) => (
            <View key={i} style={[styles.rule, { top: LINE_HEIGHT * (i + 1) }]} />
          ))}
        </View>

        <TextInput
          value={summary}
          onChangeText={(v) => onChange(v.slice(0, MAX_SUMMARY))}
          onFocus={onFocus}
          placeholder="생각보다 괜찮았던 하루"
          placeholderTextColor="rgba(90,70,54,0.4)"
          style={[styles.input, { height: memoHeight }]}
          maxLength={MAX_SUMMARY}
          returnKeyType="done"
          multiline
          textAlign="center"
        />
      </View>

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
    textAlign: 'center',
  },
  memo: {
    alignSelf: 'center',
    paddingHorizontal: SIDE_PADDING,
    // 컨테이너 gap(16) 위에 얹는다 — 질문과 줄 사이가 52로 벌어진다.
    // 아래 카운터는 gap 그대로라 줄에 붙어 있고, 질문만 한 덩어리로 떨어진다.
    marginTop: spacing.xxxl,
  },
  rule: {
    position: 'absolute',
    left: SIDE_PADDING,
    right: SIDE_PADDING,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(90,70,54,0.16)',
  },
  input: {
    fontSize: 19,
    lineHeight: LINE_HEIGHT,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.ink,
    padding: 0,
    textAlignVertical: 'top',
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
