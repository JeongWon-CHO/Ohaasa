import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FinalCard } from '@/src/components/final/FinalCard';
import { spacing, typography } from '@/src/constants/design';

interface SettingsSectionProps extends PropsWithChildren {
  title: string;
  caption?: string;
}

export function SettingsSection({ title, caption, children }: SettingsSectionProps) {
  return (
    <FinalCard style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </FinalCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
  },
  caption: {
    ...typography.body,
    lineHeight: 21,
  },
  body: {
    gap: spacing.md,
  },
});
