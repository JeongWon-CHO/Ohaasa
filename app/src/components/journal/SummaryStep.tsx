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

/**
 * background.png의 실제 비율(1254 × 975). 이미지를 갈아끼우면 여기도 같이 고쳐야 한다 —
 * 안 맞추면 resizeMode="cover"가 가장자리를 잘라내 달·구름이 사라진다.
 */
const MEMO_ASPECT = 975 / 1254;

/** 달·구름 띠가 끝나는 지점. 이보다 위에서 쓰기 시작하면 글자가 구름에 겹친다. */
const TEXT_TOP_RATIO = 0.44;

const LINE_HEIGHT = 29;
const SIDE_PADDING = 28;

interface SummaryStepProps {
  summary: string;
  onChange: (summary: string) => void;
  onFocus?: () => void;
}

export function SummaryStep({ summary, onChange, onFocus }: SummaryStepProps) {
  const { width } = useWindowDimensions();
  const memoWidth = Math.min(width, layout.maxContentWidth) - spacing.xl * 2;
  const memoHeight = memoWidth * MEMO_ASPECT;

  const textTop = Math.round(memoHeight * TEXT_TOP_RATIO);
  // 남은 높이를 줄 간격으로 나눠 편지지처럼 밑줄을 깐다.
  const ruleCount = Math.max(
    1,
    Math.floor((memoHeight - textTop - spacing.md) / LINE_HEIGHT),
  );

  return (
    <View style={styles.container}>
      {/* 질문은 왼쪽 정렬 두 줄 — 가운데 정렬하면 아래 메모지와 축이 겹쳐 답답하다. */}
      <Text style={styles.question}>
        마지막으로,{'\n'}오늘을 한마디로 남겨볼까요?
      </Text>

      <ImageBackground
        source={require('@/assets/images/background.png')}
        style={[styles.memo, { width: memoWidth, height: memoHeight }]}
        imageStyle={styles.memoImage}
        resizeMode="cover"
      >
        {/* 밑줄은 글자 줄 아래에 놓는다 — 줄 상자의 바닥이라 글자와 겹치지 않는다. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: ruleCount }, (_, i) => (
            <View
              key={i}
              style={[
                styles.rule,
                { top: textTop + LINE_HEIGHT * (i + 1) },
              ]}
            />
          ))}
        </View>

        <TextInput
          value={summary}
          onChangeText={(v) => onChange(v.slice(0, MAX_SUMMARY))}
          onFocus={onFocus}
          placeholder="생각보다 괜찮았던 하루"
          placeholderTextColor="rgba(90,70,54,0.4)"
          style={[
            styles.input,
            { marginTop: textTop, height: ruleCount * LINE_HEIGHT },
          ]}
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
    paddingHorizontal: SIDE_PADDING,
  },
  memoImage: {
    borderRadius: radius.lg,
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
