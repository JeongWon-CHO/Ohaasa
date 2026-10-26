import { mezamashiToHoroscope } from '@ohaasa/shared/lib/mezamashi';
import { ZODIAC_MAP } from '@ohaasa/shared/constants/zodiac';
import { ShareCard } from '@/src/components/share/ShareCard';
import { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMezamashiHoroscopes } from '@ohaasa/shared/hooks/useMezamashiHoroscopes';

import { MezamashiFortune } from '@/src/components/MezamashiFortune';
import { CircleDeco, MoonDeco } from '@/src/components/final/ScreenDeco';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, layout } from '@/src/constants/design';

export default function MezamashiPreviewScreen() {
  return __DEV__ ? <Preview /> : null;
}

function Preview() {
  const insets = useSafeAreaInsets();
  const [rank, setRank] = useState(12);
  const [showShare, setShowShare] = useState(false);
  const { horoscopes, loading, error, retry } = useMezamashiHoroscopes();
  const horoscope = horoscopes.find((row) => row.rank === rank);

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <CircleDeco x={-50} y={50} size={170} color={colors.sky} opacity={0.11} />
      <CircleDeco
        x={230}
        y={-20}
        size={160}
        color={colors.yellow}
        opacity={0.12}
      />
      <MoonDeco
        x={290}
        y={180}
        size={16}
        color={colors.lavender}
        opacity={0.22}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Mezamashi</Text>
            <Text style={styles.subtitle}>今日の占い · 메자마시 운세</Text>
          </View>
          {router.canGoBack() && (
            <Pressable
              accessibilityLabel="뒤로 가기"
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Feather name="x" size={20} color={colors.textMid} />
            </Pressable>
          )}
        </View>

        <View style={styles.previewControls}>
          <Text style={styles.previewLabel}>화면 미리보기</Text>
          <View style={styles.segment}>
            {[
              { rank: 1, label: '1위' },
              { rank: 2, label: '일반 순위' },
              { rank: 12, label: '12위' },
            ].map((item) => (
              <Pressable
                key={item.rank}
                accessibilityRole="button"
                accessibilityState={{ selected: rank === item.rank }}
                onPress={() => setRank(item.rank)}
                style={[styles.tab, rank === item.rank && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    rank === item.rank && styles.tabTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowShare((value) => !value)}
          style={styles.previewToggle}
        >
          <Text style={styles.tabTextActive}>
            {showShare ? '운세 화면 보기' : '공유 이미지 보기'}
          </Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator style={styles.status} color={colors.apricotDark} />
        ) : error ? (
          <View style={styles.status}>
            <Text style={styles.message}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={styles.retry}
            >
              <Text style={styles.tabTextActive}>다시 시도</Text>
            </Pressable>
          </View>
        ) : horoscope ? (
          showShare ? (
            <View style={styles.sharePreview}>
              <ShareCard
                horoscope={mezamashiToHoroscope(horoscope)}
                zodiac={ZODIAC_MAP[horoscope.zodiac_sign]}
              />
            </View>
          ) : (
            <MezamashiFortune
              key={horoscope.zodiac_sign}
              horoscope={horoscope}
            />
          )
        ) : (
          <Text style={[styles.message, styles.status]}>
            저장된 메자마시 운세가 없어요.
          </Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  previewToggle: { alignSelf: 'center', padding: 10, marginTop: 6 },
  sharePreview: { alignItems: 'center', marginTop: 12 },
  fill: { flex: 1, overflow: 'hidden' },
  scroll: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 28,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'NotoSansKR_300Light',
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: 'NotoSansKR_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSoft,
  },
  titleWrap: { flex: 1, gap: 4 },
  previewControls: { marginHorizontal: 24, gap: 8 },
  previewLabel: {
    fontFamily: 'NotoSansKR_400Regular',
    fontSize: 10,
    lineHeight: 16,
    color: colors.textSoft,
  },
  segment: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.cream2,
    padding: 4,
    borderRadius: 12,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: colors.cardSolid },
  tabText: {
    fontFamily: 'NotoSansKR_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSoft,
  },
  tabTextActive: {
    fontFamily: 'NotoSansKR_500Medium',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMid,
  },
  status: { margin: 32, alignItems: 'center' },
  message: {
    fontFamily: 'NotoSansKR_400Regular',
    fontSize: 13,
    lineHeight: 22,
    color: colors.textMid,
    textAlign: 'center',
  },
  retry: { marginTop: 12, padding: 12 },
});
