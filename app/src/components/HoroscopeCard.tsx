import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { FinalCard } from '@/src/components/final/FinalCard';
import { typography } from '@/src/constants/design';
import { useScreenSize } from '@/src/hooks/useScreenSize';

const ADVICE_CONFIG = {
  compact: { fontSize: 12, lineHeight: 22, padding: 14 },
  regular: { fontSize: 13, lineHeight: 27, padding: 20 },
} as const;

interface HoroscopeCardProps {
  advice: string;
  style?: StyleProp<ViewStyle>;
}

export function HoroscopeCard({ advice, style }: HoroscopeCardProps) {
  const cfg = ADVICE_CONFIG[useScreenSize()];
  return (
    <FinalCard style={[styles.card, { padding: cfg.padding }, style]}>
      <Text style={[styles.advice, { fontSize: cfg.fontSize, lineHeight: cfg.lineHeight }]}>
        {advice}
      </Text>
    </FinalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  advice: {
    ...typography.fortune,
    textAlign: 'center',
  },
});
