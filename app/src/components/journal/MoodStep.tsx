import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { MOOD_LEVELS, MoodFace } from '@/src/components/sketch/MoodFace';
import { colors, layout, spacing } from '@/src/constants/design';

interface MoodStepProps {
  mood: number;
  onChange: (mood: number) => void;
}

export function MoodStep({ mood, onChange }: MoodStepProps) {
  const { width } = useWindowDimensions();
  const innerWidth = Math.min(width, layout.maxContentWidth) - spacing.xl * 2;
  const faceSize = Math.min((innerWidth - spacing.sm * 4) / 5, 68);

  const selected = MOOD_LEVELS.find((l) => l.value === mood);

  return (
    <View style={styles.container}>
      <Text style={styles.question}>오늘 하루,{'\n'}어떤 기분이 가장 컸나요?</Text>

      <View style={styles.row}>
        {MOOD_LEVELS.map((level) => (
          <Pressable
            key={level.value}
            onPress={() => onChange(level.value)}
            hitSlop={6}
            style={styles.item}
          >
            <MoodFace mood={level.value} size={faceSize} dimmed={mood !== level.value} />
          </Pressable>
        ))}
      </View>

      {/* 라벨을 칸마다 두면 글자가 좁아 두 줄로 깨진다. 고른 것만 아래에 크게 보여준다. */}
      <Text style={styles.selectedLabel}>{selected?.label ?? ' '}</Text>
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
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
    minHeight: 22,
  },
});
