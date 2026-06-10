import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Polygon } from "react-native-svg";
import { useRouter } from "expo-router";

import { NotificationDeniedSheet } from "@/src/components/NotificationDeniedSheet";
import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { FinalHeader } from "@/src/components/final/FinalHeader";
import { SettingsRow } from "@/src/components/final/SettingsRow";
import { SettingsSection } from "@/src/components/final/SettingsSection";
import { Toggle } from "@/src/components/final/Toggle";
import { colors, gradients, zodiacColors } from "@/src/constants/design";
import type { ZodiacSign } from "@/src/constants/zodiac";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import { useZodiac } from "@/src/hooks/useZodiac";
import {
  checkPermissionStatus,
  requestPushToken,
  type NotifPermissionStatus,
} from "@/src/lib/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getNotificationsEnabled,
  setNotificationsEnabled as saveNotificationsEnabled,
  getOrCreateDeviceId,
  getZodiacSign,
  getPushToken,
  getPlatform,
  setPushToken,
  setPlatform,
  STORAGE_KEYS,
} from "@/src/lib/storage";
import { upsertDevice } from "@/src/lib/supabase";

// ─── Background deco helpers (same pattern as F3/F4) ─────────

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

// ─── Date ranges — "월/일–월/일" format per HTML spec ─────────

const DATE_RANGES: Record<ZodiacSign, string> = {
  aries: "3/21–4/19",
  taurus: "4/20–5/20",
  gemini: "5/21–6/21",
  cancer: "6/22–7/22",
  leo: "7/23–8/22",
  virgo: "8/23–9/23",
  libra: "9/24–10/22",
  scorpio: "10/23–11/22",
  sagittarius: "11/23–12/21",
  capricorn: "12/22–1/19",
  aquarius: "1/20–2/18",
  pisces: "2/19–3/20",
};

// ─── Screen ───────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { zodiacSign } = useZodiac();
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [storedPushToken, setStoredPushToken] = useState<string | null>(null);
  const [permStatus, setPermStatus] = useState<NotifPermissionStatus | null>(null);
  const [deniedSheetVisible, setDeniedSheetVisible] = useState(false);

  const isUnavailable = permStatus?.available === false;

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getNotificationsEnabled(),
        getPushToken(),
        checkPermissionStatus(),
      ]).then(([enabled, token, perm]) => {
        setNotificationsEnabledState(enabled);
        setStoredPushToken(token);
        setPermStatus(perm);
      });
    }, []),
  );

  async function handleToggle(next: boolean) {
    if (!next) {
      setNotificationsEnabledState(false);
      await saveNotificationsEnabled(false);
      const token = storedPushToken;
      (async () => {
        const deviceId = await getOrCreateDeviceId();
        const zodiac = await getZodiacSign();
        const platform = await getPlatform();
        if (!zodiac) return;
        await upsertDevice({ deviceId, zodiacSign: zodiac, pushToken: token, platform, notificationsEnabled: false });
      })();
      return;
    }

    if (storedPushToken) {
      setNotificationsEnabledState(true);
      await saveNotificationsEnabled(true);
      const token = storedPushToken;
      (async () => {
        const deviceId = await getOrCreateDeviceId();
        const zodiac = await getZodiacSign();
        const platform = await getPlatform();
        if (!zodiac) return;
        await upsertDevice({ deviceId, zodiacSign: zodiac, pushToken: token, platform, notificationsEnabled: true });
      })();
      return;
    }

    if (!permStatus || !permStatus.available) return;

    if (permStatus.canAskAgain) {
      const result = await requestPushToken();
      if (result.token) {
        await setPushToken(result.token);
        await setPlatform(result.platform);
        setStoredPushToken(result.token);
        setNotificationsEnabledState(true);
        await saveNotificationsEnabled(true);
        (async () => {
          const deviceId = await getOrCreateDeviceId();
          const zodiac = await getZodiacSign();
          if (!zodiac) return;
          await upsertDevice({ deviceId, zodiacSign: zodiac, pushToken: result.token, platform: result.platform, notificationsEnabled: true });
        })();
      }
      const perm = await checkPermissionStatus();
      setPermStatus(perm);
    } else {
      setDeniedSheetVisible(true);
    }
  }

  async function sendTestNotification() {
    try {
      const Notifications = await import("expo-notifications");
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("알림 권한 없음", "권한을 허용한 후 다시 시도해주세요.");
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "오하아사 테스트",
          body: "오늘의 운세가 도착했어요 ⭐",
        },
        trigger: null,
      });
    } catch (err) {
      Alert.alert("테스트 알림 실패", String(err));
    }
  }

  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const signColor = zodiacSign ? zodiacColors[zodiacSign] : colors.cream2;
  const enName = zodiac
    ? zodiac.sign.charAt(0).toUpperCase() + zodiac.sign.slice(1)
    : "";

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      {/* FinalSettings decorations — HTML spec */}
      <CircleDeco x={-50} y={50} size={160} color={colors.sky} opacity={0.1} />
      <CircleDeco
        x={228}
        y={500}
        size={140}
        color={colors.apricot}
        opacity={0.1}
      />
      <StarDeco x={46} y={128} size={5} color={colors.yellow} opacity={0.24} />
      <StarDeco x={293} y={108} size={4} color={colors.apricot} opacity={0.2} />
      <MoonDeco
        x={284}
        y={172}
        size={22}
        color={colors.apricot}
        opacity={0.17}
      />

      {/* Header */}
      <FinalHeader subtitle="설정" />

      {/* Scroll — padding '18px 20px 16px' → paddingBottom 96 for tab bar */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {/* MY SIGN */}
        <SettingsSection
          label="MY SIGN"
          style={styles.sectionGap}
          cardStyle={styles.mySignCardOverride}
        >
          <View style={styles.mySignInner}>
            {zodiac ? (
              <>
                <View
                  style={[styles.zodiacCircle, { backgroundColor: signColor }]}
                >
                  <ConstellationBadge sign={zodiac.sign} size={36} />
                </View>
                <View style={styles.zodiacCopy}>
                  <Text style={styles.zodiacName}>{zodiac.ko}</Text>
                  <Text style={styles.zodiacSub}>
                    {enName} · {DATE_RANGES[zodiac.sign]}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.zodiacCircle,
                    { backgroundColor: colors.cream2 },
                  ]}
                >
                  <ConstellationBadge size={36} />
                </View>
                <View style={styles.zodiacCopy}>
                  <Text style={styles.zodiacName}>
                    선택된 별자리가 없습니다
                  </Text>
                </View>
              </>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/onboarding",
                  params: { from: "settings" },
                })
              }
              style={({ pressed }) => [
                styles.changeButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.changeButtonText}>변경</Text>
            </Pressable>
          </View>
        </SettingsSection>

        {/* NOTIFICATIONS */}
        <SettingsSection label="NOTIFICATIONS" style={styles.sectionGap}>
          <SettingsRow
            title="아침 알림"
            description={
              isUnavailable
                ? "알림은 개발 빌드에서 사용할 수 있어요"
                : "매일 아침 운세 알림 받기"
            }
            right={
              <Toggle
                value={notificationsEnabled}
                onChange={handleToggle}
                disabled={isUnavailable}
              />
            }
            style={[styles.notifRow, notificationsEnabled && styles.rowBorder]}
          />
          {notificationsEnabled && (
            <SettingsRow
              title="알림 시각"
              description="매일 아침 07:30, 업데이트 직후"
              style={styles.notifRow}
            />
          )}
        </SettingsSection>

        {/* ABOUT */}
        <SettingsSection label="ABOUT" style={styles.aboutSection}>
          <SettingsRow
            title="오하아사 별자리"
            showChevron
            onPress={() =>
              Linking.openURL("https://www.asahi.co.jp/ohaasa/week/horoscope/")
            }
            style={[styles.aboutRow, styles.rowBorder]}
          />
          <SettingsRow
            title="고고별자리"
            showChevron
            onPress={() =>
              Linking.openURL("https://www.tv-asahi.co.jp/goodmorning/uranai/")
            }
            style={[styles.aboutRow, styles.rowBorder]}
          />
          <SettingsRow
            title="개발자에게 문의하기"
            showChevron
            onPress={() =>
              Linking.openURL(
                "https://docs.google.com/forms/d/e/1FAIpQLSdWvd5ARPMCe_lcvlmuRiTMUKNuO1gwOk8JI6vCRDJ2pu2ASw/viewform?usp=publish-editor",
              )
            }
            style={[styles.aboutRow, styles.rowBorder]}
          />
          <SettingsRow
            title="개인정보 처리방침"
            showChevron
            onPress={() =>
              Linking.openURL(
                "https://jeongwon-cho.github.io/Ohaasa/privacy-policy.html",
              )
            }
            style={styles.aboutRow}
          />
        </SettingsSection>

        {/* DEV */}
        {__DEV__ && (
          <SettingsSection label="DEV" style={styles.sectionGap}>
            <SettingsRow
              title="테스트 알림 보내기"
              description="로컬 알림 즉시 발송"
              showChevron
              onPress={sendTestNotification}
              style={[styles.aboutRow, styles.rowBorder]}
            />
            <SettingsRow
              title={storedPushToken ? "토글 비활성화 (초기화)" : "토글 활성화 시뮬레이션"}
              description={storedPushToken ? "가짜 토큰 제거" : "가짜 토큰으로 토글 ON/OFF 테스트"}
              showChevron
              onPress={() =>
                setStoredPushToken(storedPushToken ? null : "ExponentPushToken[DEV_TEST]")
              }
              style={[styles.aboutRow, styles.rowBorder]}
            />
            <SettingsRow
              title="권한 거부 시뮬레이션"
              description="토글 탭 → 설정 이동 플로우 테스트"
              showChevron
              onPress={() =>
                setPermStatus({ available: true, granted: false, canAskAgain: false })
              }
              style={[styles.aboutRow, styles.rowBorder]}
            />
            <SettingsRow
              title="권한 요청 시트 초기화"
              description="플래그 리셋 → 앱 리로드하면 시트 재표시"
              showChevron
              onPress={async () => {
                await AsyncStorage.removeItem(STORAGE_KEYS.hasAskedPushPermission);
                Alert.alert("완료", "Metro 터미널에서 'r' 눌러 리로드하면 시트가 다시 표시됩니다.");
              }}
              style={styles.aboutRow}
            />
          </SettingsSection>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogoWrap}>
            <StarDeco
              x={-14}
              y={-6}
              size={6}
              color={colors.yellow}
              opacity={0.38}
            />
            <StarDeco
              x={102}
              y={2}
              size={5}
              color={colors.apricot}
              opacity={0.32}
            />
            <Text style={styles.footerLogo}>ohaasa ✦</Text>
          </View>
          <Text style={styles.footerJa}>おはあさ</Text>
          <Text style={styles.footerCaption}>v1.0.2</Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <NotificationDeniedSheet
        visible={deniedSheetVisible}
        onOpenSettings={() => {
          setDeniedSheetVisible(false);
          Linking.openSettings();
        }}
        onClose={() => setDeniedSheetVisible(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },

  // ── Scroll content ────────────────────────────────────────────
  content: {
    paddingTop: 18,
    paddingHorizontal: 20,
  },

  // ── Section spacing ───────────────────────────────────────────
  sectionGap: {
    marginBottom: 16,
  },
  aboutSection: {
    marginBottom: 24,
  },

  // ── MY SIGN card ──────────────────────────────────────────────
  mySignCardOverride: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  mySignInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  zodiacCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  zodiacCopy: {
    flex: 1,
    minWidth: 0,
  },
  zodiacName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.text,
  },
  zodiacSub: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
    marginTop: 2,
  },
  changeButton: {
    backgroundColor: "rgba(240,184,154,0.35)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  changeButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "NotoSansKR_500Medium",
    includeFontPadding: false,
    color: colors.apricotDark,
  },
  pressed: {
    opacity: 0.72,
  },

  // ── Row styles ────────────────────────────────────────────────
  notifRow: {
    paddingVertical: 15,
  },
  openSettingsRow: {
    paddingVertical: 13,
    paddingHorizontal: 4,
    alignSelf: "flex-start",
  },
  openSettingsText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "NotoSansKR_500Medium",
    includeFontPadding: false,
    color: colors.apricotDark,
  },
  aboutRow: {
    paddingVertical: 14,
  },
  versionText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(237,227,214,0.6)",
  },

  // ── Footer ────────────────────────────────────────────────────
  footer: {
    alignItems: "center",
    paddingBottom: 6,
  },
  footerLogoWrap: {
    position: "relative",
  },
  footerLogo: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "NotoSansKR_300Light",
    includeFontPadding: false,
    color: colors.textSoft,
    letterSpacing: 2.8,
  },
  footerJa: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.apricot,
    marginTop: 4,
    letterSpacing: 2,
  },
  footerCaption: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
    marginTop: 12,
  },

  spacer: {
    minHeight: 20,
  },
});
