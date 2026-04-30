import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { colors, spacing } from '@/src/constants/design';

interface SettingsRowProps {
  title: string;
  description?: string;
  right?: ReactNode;
  onPress?: () => void;
}

export function SettingsRow({ title, description, right, onPress }: SettingsRowProps) {
  const content = (
    <>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <View style={styles.right}>
        {right}
        {onPress ? <FontAwesome color={colors.textSoft} name="angle-right" size={18} /> : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    minHeight: 52,
  },
  pressed: {
    opacity: 0.68,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  description: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  right: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
