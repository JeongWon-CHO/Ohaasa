import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { FinalCard } from '@/src/components/final/FinalCard';
import { typography } from '@/src/constants/design';

interface HoroscopeCardProps {
  advice: string;
  style?: StyleProp<ViewStyle>;
}

export function HoroscopeCard({ advice, style }: HoroscopeCardProps) {
  return (
    <FinalCard style={[styles.card, style]}>
      <Text style={styles.advice}>{advice}</Text>
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
