import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Polygon } from 'react-native-svg';

import { ZodiacPicker, ZODIAC_SIGN_COLORS } from '@/src/components/ZodiacPicker';
import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { FinalCard } from '@/src/components/final/FinalCard';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { ZODIAC_MAP, type ZodiacInfo, type ZodiacSign } from '@/src/constants/zodiac';
import { colors, gradients, radius, spacing, typography } from '@/src/constants/design';
import { useZodiac } from '@/src/hooks/useZodiac';
import { getOrCreateDeviceId } from '@/src/lib/storage';

type OnboardingStep = 'intro' | 'selection';

const COPY = {
  appName: 'ohaasa',
  introKicker: 'MORNING HOROSCOPE',
  introTitle: '매일 아침, 나의 별자리 운세',
  introBody:
    '별자리를 한 번 선택하면 매일 아침 조용히 운세를 확인할 수 있어요.',
  introCta: '시작하기',
  selectionKicker: 'STEP 1 / 1',
  selectionTitle: '내 별자리를 선택해 주세요',
  selectionBody: '생년월일에 맞는 별자리를 골라보세요',
  emptySelection: '별자리를 하나 선택해주세요.',
  saving: '저장 중...',
  finalCta: '시작하기 ✦',
  errorFallback: '온보딩 정보를 저장하지 못했습니다.',
};

const EN_NAMES: Record<ZodiacSign, string> = {
  aries: 'Aries',
  taurus: 'Taurus',
  gemini: 'Gemini',
  cancer: 'Cancer',
  leo: 'Leo',
  virgo: 'Virgo',
  libra: 'Libra',
  scorpio: 'Scorpio',
  sagittarius: 'Sagittarius',
  capricorn: 'Capricorn',
  aquarius: 'Aquarius',
  pisces: 'Pisces',
};

// ─── Background decoration helpers ───────────────────────────

type DecoProps = { x: number; y: number; size: number; color: string; opacity: number };

function CircleDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

function StarDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Polygon
          points="5,0 6.2,3.8 10,3.8 7,6.2 8.2,10 5,7.8 1.8,10 3,6.2 0,3.8 3.8,3.8"
          fill={color}
        />
      </Svg>
    </View>
  );
}

function MoonDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={color} />
      </Svg>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { zodiacSign, loading, saving, error, saveZodiacSign } = useZodiac();
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [selectedZodiacSign, setSelectedZodiacSign] = useState<ZodiacSign | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  useEffect(() => {
    if (zodiacSign) {
      setSelectedZodiacSign(zodiacSign);
    }
  }, [zodiacSign]);

  async function handleStart() {
    if (!selectedZodiacSign) {
      return;
    }

    setDeviceError(null);

    try {
      await getOrCreateDeviceId();
      await saveZodiacSign(selectedZodiacSign);
      router.replace('/(tabs)');
    } catch (startError) {
      setDeviceError(
        startError instanceof Error ? startError.message : COPY.errorFallback,
      );
    }
  }

  const selectedZodiac = selectedZodiacSign ? ZODIAC_MAP[selectedZodiacSign] : null;
  const disabled = loading || saving;

  // ── Intro step: use ScreenBackground (sky/lavender deco, unchanged)
  if (step === 'intro') {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safeArea}>
          <OnboardingIntro onStart={() => setStep('selection')} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  // ── Selection step: FinalSignSelection background (yellow/apricot deco)
  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      {/* FinalSignSelection CircleDeco */}
      <CircleDeco x={-40} y={50}  size={140} color={colors.yellow}  opacity={0.11} />
      <CircleDeco x={258} y={500} size={120} color={colors.apricot} opacity={0.12} />
      {/* Stars */}
      <StarDeco x={278} y={98}  size={5} color={colors.yellow}  opacity={0.26} />
      <StarDeco x={18}  y={298} size={4} color={colors.apricot} opacity={0.22} />
      {/* Moon */}
      <MoonDeco x={268} y={58}  size={22} color={colors.apricot} opacity={0.20} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.selectionScreen}>
          {/* Fixed header */}
          <View style={styles.selectionHeader}>
            <Text style={styles.selectionKicker}>{COPY.selectionKicker}</Text>
            <Text style={styles.selectionTitle}>{COPY.selectionTitle}</Text>
            <Text style={styles.selectionBody}>{COPY.selectionBody}</Text>
          </View>

          {/* Scrollable grid */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.apricotDark} />
            </View>
          ) : (
            <ScrollView
              style={styles.gridScroll}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}>
              <ZodiacPicker
                disabled={saving}
                onChange={setSelectedZodiacSign}
                value={selectedZodiacSign}
              />
            </ScrollView>
          )}

          {/* Flat footer CTA */}
          <SelectedZodiacBar
            disabled={!selectedZodiacSign || disabled}
            error={deviceError ?? error}
            onPress={handleStart}
            saving={saving}
            selectedZodiac={selectedZodiac}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Intro step (unchanged) ───────────────────────────────────

function OnboardingIntro({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.introContent}>
      <View style={styles.moon} />
      <Text style={styles.appName}>{COPY.appName}</Text>
      <View style={styles.hero}>
        <ConstellationBadge sign="libra" size={132} />
        <View style={[styles.star, styles.starOne]} />
        <View style={[styles.star, styles.starTwo]} />
        <View style={[styles.star, styles.starThree]} />
      </View>
      <FinalCard style={styles.introCard}>
        <Text style={styles.kicker}>{COPY.introKicker}</Text>
        <Text style={styles.introTitle}>{COPY.introTitle}</Text>
        <Text style={styles.introBody}>{COPY.introBody}</Text>
      </FinalCard>
      <Pressable
        accessibilityRole="button"
        onPress={onStart}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}>
        <Text style={styles.primaryButtonText}>{COPY.introCta}</Text>
      </Pressable>
    </View>
  );
}

// ─── Selection step CTA footer ────────────────────────────────

interface SelectedZodiacBarProps {
  disabled: boolean;
  error?: string | null;
  onPress: () => void;
  saving: boolean;
  selectedZodiac: ZodiacInfo | null;
}

function SelectedZodiacBar({
  disabled,
  error,
  onPress,
  saving,
  selectedZodiac,
}: SelectedZodiacBarProps) {
  return (
    <View style={styles.ctaFooter}>
      {selectedZodiac ? (
        <View style={styles.ctaPreview}>
          <View
            style={[
              styles.ctaBadge,
              { backgroundColor: ZODIAC_SIGN_COLORS[selectedZodiac.sign] },
            ]}>
            <ConstellationBadge sign={selectedZodiac.sign} size={28} />
          </View>
          <View>
            <Text style={styles.ctaName}>{selectedZodiac.ko}</Text>
            <Text style={styles.ctaEn}>{EN_NAMES[selectedZodiac.sign]}</Text>
          </View>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.ctaButton,
          !selectedZodiac && styles.ctaButtonDisabled,
          pressed && !disabled && styles.ctaButtonPressed,
        ]}>
        <Text
          style={[
            styles.ctaButtonText,
            !selectedZodiac && styles.ctaButtonTextDisabled,
          ]}>
          {saving ? COPY.saving : COPY.finalCta}
        </Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // ── Selection step outer wrapper ─────────────────────────────
  fill: {
    flex: 1,
    overflow: 'hidden',
  },

  // ── Intro step ──────────────────────────────────────────────
  introContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  appName: {
    ...typography.appName,
    alignSelf: 'center',
    fontSize: 38,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 230,
  },
  introCard: {
    gap: spacing.md,
  },
  kicker: {
    ...typography.label,
  },
  introTitle: {
    ...typography.sectionTitle,
    fontSize: 29,
    lineHeight: 38,
  },
  introBody: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.apricotDark,
    minHeight: 54,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButtonPressed: {
    opacity: 0.72,
  },
  moon: {
    position: 'absolute',
    right: 32,
    top: 76,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderRightWidth: 8,
    borderRightColor: colors.yellow,
    opacity: 0.8,
    transform: [{ rotate: '-18deg' }],
  },
  star: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  starOne: {
    left: 62,
    top: 56,
  },
  starTwo: {
    right: 58,
    top: 96,
    width: 6,
    height: 6,
  },
  starThree: {
    bottom: 52,
    right: 92,
  },

  // ── Selection step ───────────────────────────────────────────
  selectionScreen: {
    flex: 1,
  },
  selectionHeader: {
    paddingTop: 24,
    paddingHorizontal: 28,
    paddingBottom: 18,
  },
  selectionKicker: {
    fontSize: 10,
    color: colors.textSoft,
    letterSpacing: 2,
    marginBottom: 8,
  },
  selectionTitle: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 31,
  },
  selectionBody: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: 4,
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    paddingTop: 4,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Flat footer CTA ──────────────────────────────────────────
  ctaFooter: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: 'rgba(250,246,240,0.90)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(237,227,214,0.6)',
  },
  ctaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ctaBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  ctaEn: {
    fontSize: 10,
    color: colors.textSoft,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: colors.text,
    borderRadius: 28,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: colors.cream3,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.cream,
    letterSpacing: 0.75,
  },
  ctaButtonTextDisabled: {
    color: colors.textSoft,
  },
  ctaButtonPressed: {
    opacity: 0.72,
  },
  errorText: {
    color: colors.apricotDark,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
});
