import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Polygon } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { FinalHeader } from '@/src/components/final/FinalHeader';
import { SettingsRow } from '@/src/components/final/SettingsRow';
import { SettingsSection } from '@/src/components/final/SettingsSection';
import { Toggle } from '@/src/components/final/Toggle';
import { colors, gradients, zodiacColors } from '@/src/constants/design';
import type { ZodiacSign } from '@/src/constants/zodiac';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import { useZodiac } from '@/src/hooks/useZodiac';
import { checkPermissionStatus, type NotifPermissionStatus } from '@/src/lib/notifications';
import {
  getNotificationsEnabled,
  setNotificationsEnabled as saveNotificationsEnabled,
  getOrCreateDeviceId,
  getZodiacSign,
  getPushToken,
  getPlatform,
} from '@/src/lib/storage';
import { upsertDevice } from '@/src/lib/supabase';

// ─── Background deco helpers (same pattern as F3/F4) ─────────

type DecoProps = { x: number; y: number; size: number; color: string; opacity: number };

function CircleDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity,
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

// ─── Date ranges — "월/일–월/일" format per HTML spec ─────────

const DATE_RANGES: Record<ZodiacSign, string> = {
  aries:       '3/21–4/19',
  taurus:      '4/20–5/20',
  gemini:      '5/21–6/21',
  cancer:      '6/22–7/22',
  leo:         '7/23–8/22',
  virgo:       '8/23–9/23',
  libra:       '9/24–10/22',
  scorpio:     '10/23–11/22',
  sagittarius: '11/23–12/21',
  capricorn:   '12/22–1/19',
  aquarius:    '1/20–2/18',
  pisces:      '2/19–3/20',
};

// ─── Screen ───────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { zodiacSign } = useZodiac();
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [storedPushToken, setStoredPushToken] = useState<string | null>(null);
  const [permStatus, setPermStatus] = useState<NotifPermissionStatus | null>(null);

  const canNotify = storedPushToken !== null;
  const isPermanentlyDenied =
    permStatus?.available === true && !permStatus.granted && !permStatus.canAskAgain;

  useEffect(() => {
    Promise.all([getNotificationsEnabled(), getPushToken(), checkPermissionStatus()]).then(
      ([enabled, token, perm]) => {
        setNotificationsEnabledState(enabled);
        setStoredPushToken(token);
        setPermStatus(perm);
      },
    );
  }, []);

  async function handleToggle(next: boolean) {
    if (next && !storedPushToken) return; // push_token 없으면 ON 불가

    setNotificationsEnabledState(next);
    saveNotificationsEnabled(next);

    const currentPushToken = storedPushToken;
    (async () => {
      const deviceId = await getOrCreateDeviceId();
      const zodiac = await getZodiacSign();
      const platform = await getPlatform();
      if (!zodiac) return;
      await upsertDevice({ deviceId, zodiacSign: zodiac, pushToken: currentPushToken, platform, notificationsEnabled: next });
    })();
  }

  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const signColor = zodiacSign ? zodiacColors[zodiacSign] : colors.cream2;
  const enName = zodiac
    ? zodiac.sign.charAt(0).toUpperCase() + zodiac.sign.slice(1)
    : '';

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      {/* FinalSettings decorations — HTML spec */}
      <CircleDeco x={-50} y={50}   size={160} color={colors.sky}     opacity={0.10} />
      <CircleDeco x={228} y={500}  size={140} color={colors.apricot} opacity={0.10} />
      <StarDeco   x={46}  y={128}  size={5}   color={colors.yellow}  opacity={0.24} />
      <StarDeco   x={293} y={108}  size={4}   color={colors.apricot} opacity={0.20} />
      <MoonDeco   x={284} y={172}  size={22}  color={colors.apricot} opacity={0.17} />

      {/* Header */}
      <FinalHeader subtitle="설정" />

      {/* Scroll — padding '18px 20px 16px' → paddingBottom 96 for tab bar */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 16 }]}
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
                <View style={[styles.zodiacCircle, { backgroundColor: signColor }]}>
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
                <View style={[styles.zodiacCircle, { backgroundColor: colors.cream2 }]}>
                  <ConstellationBadge size={36} />
                </View>
                <View style={styles.zodiacCopy}>
                  <Text style={styles.zodiacName}>선택된 별자리가 없습니다</Text>
                </View>
              </>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/onboarding')}
              style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}
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
              canNotify
                ? '매일 아침 운세 알림 받기'
                : isPermanentlyDenied
                  ? '시스템 설정에서 알림을 허용해주세요'
                  : '알림은 개발 빌드에서 사용할 수 있어요'
            }
            right={
              <Toggle
                value={notificationsEnabled}
                onChange={handleToggle}
                disabled={!canNotify}
              />
            }
            style={[
              styles.notifRow,
              (notificationsEnabled || isPermanentlyDenied) && styles.rowBorder,
            ]}
          />
          {isPermanentlyDenied && (
            <Pressable
              accessibilityRole="button"
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [styles.openSettingsRow, pressed && styles.pressed]}
            >
              <Text style={styles.openSettingsText}>설정 열기</Text>
            </Pressable>
          )}
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
            onPress={() => Linking.openURL('https://www.asahi.co.jp/ohaasa/week/horoscope/')}
            style={[styles.aboutRow, styles.rowBorder]}
          />
          <SettingsRow
            title="고고별자리"
            showChevron
            onPress={() => Linking.openURL('https://www.tv-asahi.co.jp/goodmorning/uranai/')}
            style={[styles.aboutRow, styles.rowBorder]}
          />
          <SettingsRow
            title="개발자에게 문의하기"
            showChevron
            onPress={() => Linking.openURL('https://docs.google.com/forms/d/e/1FAIpQLSdWvd5ARPMCe_lcvlmuRiTMUKNuO1gwOk8JI6vCRDJ2pu2ASw/viewform?usp=publish-editor')}
            style={[styles.aboutRow, styles.rowBorder]}
          />
          <SettingsRow
            title="개인정보 처리방침"
            showChevron
            onPress={() => Linking.openURL('https://jeongwon-cho.github.io/Ohaasa/privacy-policy.html')}
            style={styles.aboutRow}
          />
        </SettingsSection>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogoWrap}>
            <StarDeco x={-14} y={-6} size={6} color={colors.yellow}  opacity={0.38} />
            <StarDeco x={102} y={2}  size={5} color={colors.apricot} opacity={0.32} />
            <Text style={styles.footerLogo}>ohaasa ✦</Text>
          </View>
          <Text style={styles.footerJa}>おはあさ</Text>
          <Text style={styles.footerCaption}>v1.0.0</Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  zodiacCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zodiacCopy: {
    flex: 1,
    minWidth: 0,
  },
  zodiacName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'NotoSansKR_400Regular',
    includeFontPadding: false,
    color: colors.text,
  },
  zodiacSub: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'NotoSansKR_400Regular',
    includeFontPadding: false,
    color: colors.textSoft,
    marginTop: 2,
  },
  changeButton: {
    backgroundColor: 'rgba(240,184,154,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  changeButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'NotoSansKR_500Medium',
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
    alignSelf: 'flex-start',
  },
  openSettingsText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'NotoSansKR_500Medium',
    includeFontPadding: false,
    color: colors.apricotDark,
  },
  aboutRow: {
    paddingVertical: 14,
  },
  versionText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'NotoSansKR_400Regular',
    includeFontPadding: false,
    color: colors.textSoft,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(237,227,214,0.6)',
  },

  // ── Footer ────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  footerLogoWrap: {
    position: 'relative',
  },
  footerLogo: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'NotoSansKR_300Light',
    includeFontPadding: false,
    color: colors.textSoft,
    letterSpacing: 2.8,
  },
  footerJa: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'NotoSansKR_400Regular',
    includeFontPadding: false,
    color: colors.apricot,
    marginTop: 4,
    letterSpacing: 2,
  },
  footerCaption: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'NotoSansKR_400Regular',
    includeFontPadding: false,
    color: colors.textSoft,
    marginTop: 12,
  },

  spacer: {
    minHeight: 20,
  },
});
