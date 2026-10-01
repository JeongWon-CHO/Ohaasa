import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter , useFocusEffect } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { WelcomeScreen } from "@/src/components/WelcomeScreen";

import {
  ZodiacPicker,
  ZODIAC_SIGN_COLORS,
} from "@/src/components/ZodiacPicker";
import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import {
  CircleDeco,
  MoonDeco,
  StarDeco,
} from "@/src/components/final/ScreenDeco";
import {
  ZODIAC_MAP,
  type ZodiacInfo,
  type ZodiacSign,
} from "@ohaasa/shared/constants/zodiac";
import { colors, gradients, layout } from "@/src/constants/design";
import { useZodiac } from "@ohaasa/shared/hooks/useZodiac";
import {
  getOrCreateDeviceId,
  getPushToken,
  getPlatform,
  getNotificationsEnabled,
  setHasSeenOnboarding,
} from "@ohaasa/shared/lib/storage";
import { upsertDevice } from "@ohaasa/shared/lib/supabase";

type OnboardingStep = "intro" | "selection";

// const COPY = {
//   selectionKicker: "STEP 1 / 1",
//   selectionTitle: "내 별자리를 선택해 주세요",
//   selectionBody: "생년월일에 맞는 별자리를 골라주세요. 아침 운세를 보여드릴 때 써요.",
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

// ─── Main screen ─────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { from, initialStep } = useLocalSearchParams<{ from?: string; initialStep?: string }>();
  const { zodiacSign, loading, saving, error, saveZodiacSign } = useZodiac();
  const [step, setStep] = useState<OnboardingStep>(
    from === "settings" || initialStep === "selection" ? "selection" : "intro",
  );
  const [selectedZodiacSign, setSelectedZodiacSign] =
    useState<ZodiacSign | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const multiTouchRef = useRef(false);
  const navigatingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      navigatingRef.current = false;
      multiTouchRef.current = false;
    }, []),
  );

  // 저장돼 있던 별자리를 선택 상태로 끌어온다. effect가 아니라 렌더 중 조정인 이유는
  // 한 프레임 동안 아무것도 선택되지 않은 화면이 보이지 않게 하기 위함.
  const [lastZodiacSign, setLastZodiacSign] = useState(zodiacSign);
  if (lastZodiacSign !== zodiacSign) {
    setLastZodiacSign(zodiacSign);
    if (zodiacSign) setSelectedZodiacSign(zodiacSign);
  }

  async function handleStart() {
    if (!selectedZodiacSign || navigatingRef.current || multiTouchRef.current) {
      return;
    }
    navigatingRef.current = true;

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
        await upsertDevice({
          deviceId,
          zodiacSign: zodiacForUpsert,
          pushToken,
          platform,
          notificationsEnabled,
        });
      })();

      if (from === "settings") {
        router.back();
      } else {
        await setHasSeenOnboarding();
        router.replace("/(tabs)");
      }
    } catch (startError) {
      navigatingRef.current = false;
      setDeviceError(
        startError instanceof Error
          ? startError.message
          : "온보딩 정보를 저장하지 못했습니다.",
      );
    }
  }

  /**
   * 별자리는 이제 선택 항목이다 — 운세는 홈 맨 위 한 줄에만 쓰이는 부가 기능이라
   * 이걸 고르지 않아도 일기 앱으로서는 완전히 동작한다.
   * 나중에 My에서 언제든 설정할 수 있다.
   */
  async function handleSkip() {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    await setHasSeenOnboarding();
    router.replace("/(tabs)");
  }

  const selectedZodiac = selectedZodiacSign
    ? ZODIAC_MAP[selectedZodiacSign]
    : null;
  const disabled = loading || saving;

  // ── Intro step — FinalOnboarding layout
  if (step === "intro") {
    return (
      <WelcomeScreen onStart={() => setStep("selection")} />
    );
  }

  // ── Selection step — FinalSignSelection layout (unchanged)
  return (
    <LinearGradient
      colors={gradients.screen}
      style={styles.fill}
      onTouchStart={(e) => {
        if (e.nativeEvent.touches.length > 1) {
          multiTouchRef.current = true;
        }
      }}
      onTouchEnd={(e) => {
        const remaining =
          e.nativeEvent.touches.length - e.nativeEvent.changedTouches.length;
        if (remaining <= 0) {
          requestAnimationFrame(() => {
            multiTouchRef.current = false;
          });
        }
      }}
    >
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

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.selectionScreen}>
          {/* Fixed header */}
          <View style={styles.selectionHeader}>
            <Text style={styles.selectionKicker}>STEP 1 / 1</Text>
            <Text style={styles.selectionTitle}>내 별자리를 선택해 주세요</Text>
            <Text style={styles.selectionBody}>
              {
                "생년월일에 맞는 별자리를 골라주세요.\n아침 운세를 보여드릴 때 써요."
              }
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
                multiTouchRef={multiTouchRef}
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
            onSkip={from === "settings" ? undefined : handleSkip}
            saving={saving}
            selectedZodiac={selectedZodiac}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Intro step ───────────────────────────────────────────────

// ─── Selection step CTA footer (unchanged) ───────────────────

interface SelectedZodiacBarProps {
  disabled: boolean;
  error?: string | null;
  onPress: () => void;
  /** 설정에서 별자리를 바꾸러 들어온 경우에는 넘기지 않는다 */
  onSkip?: () => void;
  saving: boolean;
  selectedZodiac: ZodiacInfo | null;
}

function SelectedZodiacBar({
  disabled,
  error,
  onPress,
  onSkip,
  saving,
  selectedZodiac,
}: SelectedZodiacBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.ctaFooter,
        { paddingBottom: (Platform.OS === "ios" ? 2 : 20) + insets.bottom },
      ]}
    >
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
      {onSkip ? (
        <Pressable
          accessibilityRole="button"
          onPress={onSkip}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>나중에 할게요</Text>
        </Pressable>
      ) : null}
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
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  fill: {
    flex: 1,
    overflow: "hidden",
  },

  // ── F1: Intro step ────────────────────────────────────────────
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
    fontFamily: "NotoSansKR_400Regular",
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
    lineHeight: 18,
    fontFamily: "NotoSansKR_500Medium",
    includeFontPadding: false,
    color: colors.text,
  },
  ctaEn: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
  },
  skipButton: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    textDecorationLine: "underline",
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
    lineHeight: 20,
    fontFamily: "NotoSansKR_500Medium",
    includeFontPadding: false,
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
    lineHeight: 18,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    marginTop: 12,
  },
});
