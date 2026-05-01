import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { colors } from '@/src/constants/design';

interface DatePillProps {
  dateText?: string;
  label?: string; // kept for backwards-compat, not rendered
}

export function DatePill({ dateText = '' }: DatePillProps) {
  return (
    <View style={styles.pill}>
      <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={colors.skyDark} strokeWidth="2.5" />
        <Line
          x1="12" y1="8" x2="12" y2="12"
          stroke={colors.skyDark} strokeWidth="2.5" strokeLinecap="round"
        />
        <Line
          x1="12" y1="16" x2="12.01" y2="16"
          stroke={colors.skyDark} strokeWidth="2.5" strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.date}>{dateText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(184,216,232,0.45)',
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  date: {
    fontSize: 10,
    color: colors.skyDark,
  },
});
