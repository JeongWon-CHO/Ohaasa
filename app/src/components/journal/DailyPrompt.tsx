import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/src/constants/design';
import { getPromptForDate } from '@/src/constants/drawingPrompts';

/**
 * 그림일기의 최대 이탈 지점은 빈 캔버스 앞에서 "오늘 뭘 그리지"로 막히는 것이다.
 * 그래서 이 블록은 홈의 빈 자리를 메우려는 장식이 아니라 [오늘 일기 쓰기] 바로 위에서
 * 행동을 밀어주는 자리에 둔다.
 *
 * 카드(배경 + 테두리)로 두지 않는다 — 위에 이미 운세 줄과 달력이 상자로 쌓여 있어서
 * 셋째 상자가 되면 화면이 칸막이처럼 답답해진다. 배경 위에 글만 얹어 여백으로 띄운다.
 */

interface DailyPromptProps {
  date: string;
  offset: number;
  /**
   * 없으면 새로고침을 감춘다. 이미 오늘 기록을 남긴 뒤에 질문이 바뀌면
   * 그림이 어떤 질문에 대한 것이었는지 어긋난다.
   */
  onShuffle?: () => void;
}

export function DailyPrompt({ date, offset, onShuffle }: DailyPromptProps) {
  const prompt = getPromptForDate(date, offset);
  if (!prompt) return null;

  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>오늘은 이런 걸 그려볼까요</Text>
        {onShuffle && (
          <Pressable onPress={onShuffle} hitSlop={12} style={styles.shuffle}>
            <Feather name="refresh-cw" size={11} color={colors.textSoft} />
            <Text style={styles.shuffleText}>다른 질문</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.prompt}>{prompt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 왼쪽 정렬. 여러 줄짜리 질문을 가운데 정렬하면 줄 길이가 들쭉날쭉해 읽기 나쁘다.
  // 좌우 패딩을 두지 않아 화면 헤더(앱 이름·날짜)와 왼쪽 끝이 맞는다.
  block: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    letterSpacing: 0.5,
  },
  prompt: {
    alignSelf: 'stretch',
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.ink,
  },
  shuffle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    // 오른쪽 끝을 헤더와 맞추려고 패딩 없이 hitSlop으로만 터치 영역을 넓힌다.
    paddingVertical: spacing.xs,
  },
  shuffleText: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
});
