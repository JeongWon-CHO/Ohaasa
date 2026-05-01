import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { FinalCard } from '@/src/components/final/FinalCard';
import { colors } from '@/src/constants/design';

interface SettingsSectionProps extends PropsWithChildren {
  label: string;
  style?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
}

export function SettingsSection({ label, children, style, cardStyle }: SettingsSectionProps) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <FinalCard style={[styles.card, cardStyle]}>
        {children}
      </FinalCard>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    color: colors.textSoft,
    letterSpacing: 1.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    paddingHorizontal: 18,
    paddingVertical: 0,
  },
});
