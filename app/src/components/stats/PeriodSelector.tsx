import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/constants/design';
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
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(184,216,232,0.45)',
  },
  pillActive: {
    backgroundColor: colors.apricotDark,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.skyDark,
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
