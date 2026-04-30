import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { FinalCard } from '@/src/components/final/FinalCard';
import { FinalHeader } from '@/src/components/final/FinalHeader';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { SettingsRow } from '@/src/components/final/SettingsRow';
import { SettingsSection } from '@/src/components/final/SettingsSection';
import { Toggle } from '@/src/components/final/Toggle';
import { colors, radius, spacing, typography } from '@/src/constants/design';
import type { ZodiacSign } from '@/src/constants/zodiac';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import { useZodiac } from '@/src/hooks/useZodiac';

const COPY = {
  subtitle: '\uc124\uc815',
  zodiacTitle: '\ub098\uc758 \ubcc4\uc790\ub9ac',
  changeZodiac: '\ubcc4\uc790\ub9ac \ubcc0\uacbd\ud558\uae30',
  notSelected: '\uc120\ud0dd\ub41c \ubcc4\uc790\ub9ac\uac00 \uc5c6\uc2b5\ub2c8\ub2e4',
  notificationTitle: '\uc544\uce68 \uc54c\ub9bc',
  notificationCaption:
    '\uc54c\ub9bc \uc124\uc815\uc740 \ud604\uc7ac UI\ub9cc \uc900\ube44\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.',
  notificationToggle: '\uc624\uc804 \uc54c\ub9bc',
  notificationTime: '\uc54c\ub9bc \uc2dc\uac01',
  notificationHint:
    '\uc54c\ub9bc \uae30\ub2a5\uc740 \ucd94\ud6c4 \uc2e4\uc81c \uae30\uae30 \ud1a0\ud070 \ub4f1\ub85d \ud6c4 \ud65c\uc131\ud654\ub429\ub2c8\ub2e4.',
  appInfoTitle: '\uc571 \uc815\ubcf4',
  source: '\ub370\uc774\ud130 \uc18c\uc2a4',
  sourceBody: '\uc544\uc0ac\ud788\ubc29\uc1a1 \ubcc4\uc790\ub9ac \uc6b4\uc138 JSON API',
  fallback: '\ubc29\uc1a1 \uc5c6\ub294 \ub0a0',
  fallbackBody: '\uc77c\uc694\uc77c\uc774\ub098 \ub370\uc774\ud130\uac00 \uc5c6\ub294 \ub0a0\uc740 \ucd5c\uc2e0 \ubc29\uc1a1\ubd84\uc744 \ud45c\uc2dc\ud560 \uc608\uc815\uc785\ub2c8\ub2e4.',
  version: '\uc571 \ubc84\uc804',
  policy: '\uac1c\uc778\uc815\ubcf4 \ucc98\ub9ac\ubc29\uce68',
  policyBody: '\uc900\ube44 \uc911',
};

const DATE_RANGES: Record<ZodiacSign, string> = {
  aries: '3.21 - 4.19',
  taurus: '4.20 - 5.20',
  gemini: '5.21 - 6.21',
  cancer: '6.22 - 7.22',
  leo: '7.23 - 8.22',
  virgo: '8.23 - 9.22',
  libra: '9.23 - 10.23',
  scorpio: '10.24 - 11.22',
  sagittarius: '11.23 - 12.21',
  capricorn: '12.22 - 1.19',
  aquarius: '1.20 - 2.18',
  pisces: '2.19 - 3.20',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { zodiacSign } = useZodiac();
  const [morningNotificationEnabled, setMorningNotificationEnabled] = useState(false);
  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FinalHeader subtitle={COPY.subtitle} />

        <FinalCard style={styles.zodiacCard}>
          {zodiac ? (
            <>
              <ConstellationBadge sign={zodiac.sign} size={76} />
              <View style={styles.zodiacCopy}>
                <Text style={styles.sectionLabel}>{COPY.zodiacTitle}</Text>
                <Text style={styles.zodiacName}>{zodiac.ko}</Text>
                <Text style={styles.zodiacMeta}>
                  {zodiac.ja} · {DATE_RANGES[zodiac.sign]}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.zodiacCopy}>
              <Text style={styles.sectionLabel}>{COPY.zodiacTitle}</Text>
              <Text style={styles.zodiacName}>{COPY.notSelected}</Text>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/onboarding')}
            style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}>
            <Text style={styles.changeButtonText}>{COPY.changeZodiac}</Text>
          </Pressable>
        </FinalCard>

        <SettingsSection
          caption={COPY.notificationCaption}
          title={COPY.notificationTitle}>
          <SettingsRow
            description={COPY.notificationHint}
            right={
              <Toggle
                onChange={setMorningNotificationEnabled}
                value={morningNotificationEnabled}
              />
            }
            title={COPY.notificationToggle}
          />
          <View style={styles.divider} />
          <SettingsRow
            description="07:30"
            right={<Text style={styles.valueText}>KST/JST</Text>}
            title={COPY.notificationTime}
          />
        </SettingsSection>

        <SettingsSection title={COPY.appInfoTitle}>
          <SettingsRow description={COPY.sourceBody} title={COPY.source} />
          <View style={styles.divider} />
          <SettingsRow description={COPY.fallbackBody} title={COPY.fallback} />
          <View style={styles.divider} />
          <SettingsRow description="MVP · Phase 6 UI" title={COPY.version} />
          <View style={styles.divider} />
          <SettingsRow description={COPY.policyBody} title={COPY.policy} />
        </SettingsSection>

        <View style={styles.spacer} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: 96,
  },
  zodiacCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  zodiacCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    ...typography.label,
  },
  zodiacName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  zodiacMeta: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  changeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.apricotDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  valueText: {
    color: colors.textMid,
    fontSize: 13,
    fontWeight: '800',
  },
  spacer: {
    minHeight: 20,
  },
});
