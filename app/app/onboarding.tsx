import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Line, Path, Polygon } from "react-native-svg";

import {
  ZodiacPicker,
  ZODIAC_SIGN_COLORS,
} from "@/src/components/ZodiacPicker";
import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import {
  ZODIAC_MAP,
  type ZodiacInfo,
  type ZodiacSign,
} from "@/src/constants/zodiac";
import { colors, gradients } from "@/src/constants/design";
import { useZodiac } from "@/src/hooks/useZodiac";
import {
  getOrCreateDeviceId,
  getPushToken,
  getPlatform,
  getNotificationsEnabled,
} from "@/src/lib/storage";
import { upsertDevice } from "@/src/lib/supabase";

type OnboardingStep = "intro" | "selection";

// const COPY = {
//   selectionKicker: "STEP 1 / 1",
//   selectionTitle: "내 별자리를 선택해 주세요",
//   selectionBody: "생년월일에 맞는 별자리를 골라보세요",
//   saving: "저장 중...",
//   finalCta: "시작하기 ✦",
//   errorFallback: "온보딩 정보를 저장하지 못했습니다.",
// };

const EN_NAMES: Record<ZodiacSign, string> = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces",
};

// ─── Background decoration helpers ───────────────────────────

type DecoProps = {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
};

function CircleDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
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
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y, opacity }}
    >
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
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y, opacity }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { zodiacSign, loading, saving, error, saveZodiacSign } = useZodiac();
  const [step, setStep] = useState<OnboardingStep>("intro");
  const [selectedZodiacSign, setSelectedZodiacSign] =
    useState<ZodiacSign | null>(null);
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

      // zodiac 선반영 — fire-and-forget
      // 첫 진입: pushToken 아직 미캐싱(null) → _layout.tsx에서 최종 반영
      // 별자리 변경: 기존 캐싱 토큰으로 zodiac_sign 즉시 갱신
      const zodiacForUpsert = selectedZodiacSign;
      (async () => {
        const deviceId = await getOrCreateDeviceId();
        const pushToken = await getPushToken();
        const platform = await getPlatform();
        const notificationsEnabled = await getNotificationsEnabled();
        await upsertDevice({ deviceId, zodiacSign: zodiacForUpsert, pushToken, platform, notificationsEnabled });
      })();

      router.replace("/(tabs)");
    } catch (startError) {
      setDeviceError(
        startError instanceof Error
          ? startError.message
          : "온보딩 정보를 저장하지 못했습니다.",
      );
    }
  }

  const selectedZodiac = selectedZodiacSign
    ? ZODIAC_MAP[selectedZodiacSign]
    : null;
  const disabled = loading || saving;

  // ── Intro step — FinalOnboarding layout
  if (step === "intro") {
    return (
      <LinearGradient colors={gradients.screen} style={styles.fill}>
        {/* FinalOnboarding decorations — HTML spec */}
        <CircleDeco
          x={-30}
          y={80}
          size={130}
          color={colors.sky}
          opacity={0.16}
        />
        <CircleDeco
          x={255}
          y={400}
          size={160}
          color={colors.apricot}
          opacity={0.13}
        />
        <CircleDeco
          x={100}
          y={620}
          size={80}
          color={colors.lavender}
          opacity={0.16}
        />
        <StarDeco
          x={40}
          y={118}
          size={7}
          color={colors.yellow}
          opacity={0.45}
        />
        <StarDeco
          x={288}
          y={90}
          size={5}
          color={colors.apricot}
          opacity={0.38}
        />
        <StarDeco
          x={58}
          y={316}
          size={4}
          color={colors.skyDark}
          opacity={0.3}
        />
        <StarDeco
          x={278}
          y={278}
          size={6}
          color={colors.yellow}
          opacity={0.4}
        />
        <StarDeco
          x={148}
          y={518}
          size={5}
          color={colors.apricot}
          opacity={0.35}
        />
        <MoonDeco
          x={265}
          y={158}
          size={28}
          color={colors.apricot}
          opacity={0.3}
        />
        <MoonDeco
          x={18}
          y={475}
          size={20}
          color={colors.skyDark}
          opacity={0.25}
        />
        <SafeAreaView style={styles.safeArea}>
          <OnboardingIntro onStart={() => setStep("selection")} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Selection step — FinalSignSelection layout (unchanged)
  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      {/* FinalSignSelection CircleDeco */}
      <CircleDeco
        x={-40}
        y={50}
        size={140}
        color={colors.yellow}
        opacity={0.11}
      />
      <CircleDeco
        x={258}
        y={500}
        size={120}
        color={colors.apricot}
        opacity={0.12}
      />
      {/* Stars */}
      <StarDeco x={278} y={98} size={5} color={colors.yellow} opacity={0.26} />
      <StarDeco x={18} y={298} size={4} color={colors.apricot} opacity={0.22} />
      {/* Moon */}
      <MoonDeco x={268} y={58} size={22} color={colors.apricot} opacity={0.2} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.selectionScreen}>
          {/* Fixed header */}
          <View style={styles.selectionHeader}>
            <Text style={styles.selectionKicker}>STEP 1 / 1</Text>
            <Text style={styles.selectionTitle}>내 별자리를 선택해 주세요</Text>
            <Text style={styles.selectionBody}>
              생년월일에 맞는 별자리를 골라보세요
            </Text>
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
              showsVerticalScrollIndicator={false}
            >
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

// ─── Intro step ───────────────────────────────────────────────

function OnboardingIntro({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.introWrap}>
      {/* Hero constellation — 190×190, hex pattern per HTML spec */}
      <View style={styles.heroContainer}>
        {/* Radial glow — 4 concentric circles, center most opaque → edge transparent */}
        <View style={styles.heroGlowL1} />
        <View style={styles.heroGlowL2} />
        <View style={styles.heroGlowL3} />
        <View style={styles.heroGlowL4} />
        <Svg
          width={190}
          height={190}
          viewBox="0 0 190 190"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {/* Hex outline — sequential edges, strokeOpacity 0.5 */}
          <Line
            x1="60"
            y1="78"
            x2="100"
            y2="58"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          <Line
            x1="100"
            y1="58"
            x2="140"
            y2="74"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          <Line
            x1="140"
            y1="74"
            x2="150"
            y2="118"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          <Line
            x1="150"
            y1="118"
            x2="110"
            y2="138"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          <Line
            x1="110"
            y1="138"
            x2="70"
            y2="128"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          {/* Closing edge */}
          <Line
            x1="70"
            y1="128"
            x2="60"
            y2="78"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          {/* Cross diagonal — lower opacity */}
          <Line
            x1="100"
            y1="58"
            x2="110"
            y2="138"
            stroke={colors.yellow}
            strokeWidth="1.5"
            strokeOpacity="0.28"
            strokeLinecap="round"
          />
          {/* Vertex dots + center dot */}
          <Circle cx="60" cy="78" r="5" fill={colors.yellow} opacity="0.85" />
          <Circle
            cx="100"
            cy="58"
            r="4.5"
            fill={colors.yellow}
            opacity="0.85"
          />
          <Circle cx="140" cy="74" r="4" fill={colors.yellow} opacity="0.85" />
          <Circle
            cx="150"
            cy="118"
            r="3.5"
            fill={colors.yellow}
            opacity="0.85"
          />
          <Circle
            cx="110"
            cy="138"
            r="4.5"
            fill={colors.yellow}
            opacity="0.85"
          />
          <Circle
            cx="70"
            cy="128"
            r="3.5"
            fill={colors.yellow}
            opacity="0.85"
          />
          <Circle cx="95" cy="103" r="3" fill={colors.yellow} opacity="0.85" />
        </Svg>
      </View>

      {/* Logo */}
      <Text style={styles.introLogo}>ohaasa</Text>

      {/* おはあさ subtitle */}
      <Text style={styles.introSubtext}>おはあさ</Text>

      {/* Body */}
      <Text style={styles.introBody}>
        {"매일 아침, 나의 별자리 운세를\n가장 먼저 확인하세요."}
      </Text>

      {/* CTA — dark bg, borderRadius 28 per HTML spec */}
      <Pressable
        accessibilityRole="button"
        onPress={onStart}
        style={({ pressed }) => [
          styles.introButton,
          pressed && styles.introButtonPressed,
        ]}
      >
        <Text style={styles.introButtonText}>시작하기</Text>
      </Pressable>

      {/* Caption */}
      <Text style={styles.introCaption}>매일 아침 7:30에 업데이트됩니다</Text>
    </View>
  );
}

// ─── Selection step CTA footer (unchanged) ───────────────────

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
            ]}
          >
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
        ]}
      >
        <Text
          style={[
            styles.ctaButtonText,
            !selectedZodiac && styles.ctaButtonTextDisabled,
          ]}
        >
          {saving ? "저장 중..." : "시작하기 ✦"}
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
  fill: {
    flex: 1,
    overflow: "hidden",
  },

  // ── F1: Intro step ────────────────────────────────────────────
  introWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  heroContainer: {
    width: 190,
    height: 190,
    marginBottom: 32,
  },
  // Radial glow approximation — 4 layers, opacity accumulates toward center
  // center total ~0.34, outer edge ~0.07, beyond r=85 transparent
  heroGlowL1: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 85,
    backgroundColor: colors.yellow,
    opacity: 0.07,
  },
  heroGlowL2: {
    position: "absolute",
    top: 28,
    left: 28,
    right: 28,
    bottom: 28,
    borderRadius: 67,
    backgroundColor: colors.yellow,
    opacity: 0.09,
  },
  heroGlowL3: {
    position: "absolute",
    top: 48,
    left: 48,
    right: 48,
    bottom: 48,
    borderRadius: 47,
    backgroundColor: colors.yellow,
    opacity: 0.1,
  },
  heroGlowL4: {
    position: "absolute",
    top: 66,
    left: 66,
    right: 66,
    bottom: 66,
    borderRadius: 29,
    backgroundColor: colors.yellow,
    opacity: 0.08,
  },
  introLogo: {
    fontSize: 40,
    fontWeight: "300",
    color: colors.text,
    letterSpacing: 4.8,
    marginBottom: 6,
  },
  introSubtext: {
    fontSize: 11,
    fontWeight: "400",
    color: colors.textSoft,
    letterSpacing: 2.42,
    marginBottom: 16,
  },
  introBody: {
    fontSize: 14,
    fontWeight: "300",
    color: colors.textMid,
    textAlign: "center",
    lineHeight: 25.2,
    marginBottom: 52,
  },
  introButton: {
    alignSelf: "stretch",
    backgroundColor: colors.text,
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  introButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.cream,
    letterSpacing: 0.9,
  },
  introButtonPressed: {
    opacity: 0.72,
  },
  introCaption: {
    fontSize: 12,
    color: colors.textSoft,
  },

  // ── F2: Selection step ────────────────────────────────────────
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
    fontWeight: "400",
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
    alignItems: "center",
    justifyContent: "center",
  },

  // ── F2: Flat footer CTA ───────────────────────────────────────
  ctaFooter: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: "rgba(250,246,240,0.90)",
    borderTopWidth: 1,
    borderTopColor: "rgba(237,227,214,0.6)",
  },
  ctaPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  ctaBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ctaName: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
  },
  ctaEn: {
    fontSize: 10,
    color: colors.textSoft,
  },
  ctaButton: {
    width: "100%",
    backgroundColor: colors.text,
    borderRadius: 28,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButtonDisabled: {
    backgroundColor: colors.cream3,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: "500",
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
