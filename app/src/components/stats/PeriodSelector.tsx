import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadows } from '@/src/constants/design';
import type { TrendsPeriod } from '@/src/hooks/useHoroscopeTrends';

interface PeriodSelectorProps {
  value: TrendsPeriod;
  onChange: (period: TrendsPeriod) => void;
}

const OPTIONS: { value: TrendsPeriod; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <View style={styles.track}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: colors.segmentTrack,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: colors.cardSolid,
    ...shadows.card,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
  },
  labelActive: {
    fontFamily: 'NotoSansKR_700Bold',
    color: colors.apricotDark,
  },
});
