import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZODIAC_LIST, ZODIAC_MAP, type ZodiacSign } from '@ohaasa/shared/constants/zodiac';
import { HOROSCOPE_SOURCE_LABELS, type HoroscopeSource } from '@ohaasa/shared/types/horoscope';
import { isBroadcastSource } from '@ohaasa/shared/lib/broadcastHoroscopes';
import { isTodayHoroscope } from '@ohaasa/shared/lib/horoscopeDate';
import { useBroadcastHoroscopes } from '@ohaasa/shared/hooks/useBroadcastHoroscopes';
import { formatBroadcastDate } from '@ohaasa/shared/hooks/useHoroscope';
import { useZodiac } from '@ohaasa/shared/hooks/useZodiac';
import { useShareHoroscope } from '@ohaasa/shared/hooks/useShareHoroscope';
import { useToast } from '@ohaasa/shared/hooks/useToast';
import { DatePill } from '@/src/components/final/DatePill';
import { ZodiacHeroCircle } from '@/src/components/final/ZodiacHeroCircle';
import { GogoInfoGrid } from '@/src/components/final/GogoInfoGrid';
import { HoroscopeCard } from '@/src/components/HoroscopeCard';
import { MezamashiFortune } from '@/src/components/MezamashiFortune';
import { ShareCard } from '@/src/components/share/ShareCard';
import { MediaDeniedSheet } from '@/src/components/MediaDeniedSheet';
import { Toast } from '@/src/components/common/Toast';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { colors, gradients, layout } from '@/src/constants/design';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function BroadcastScreen() {
  const { source } = useLocalSearchParams<{ source: string }>();
  if (!isBroadcastSource(source)) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.invalid}>
        <Text style={styles.message}>방송을 찾을 수 없어요.</Text>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.retry}>
          <Text style={styles.message}>돌아가기</Text>
        </Pressable>
      </LinearGradient>
    );
  }
  return <BroadcastFortune key={source} source={source} />;
}

function BroadcastFortune({ source }: { source: HoroscopeSource }) {
  const insets = useSafeAreaInsets();
  const { zodiacSign, loading: zodiacLoading } = useZodiac();
  const [pickedSign, setPickedSign] = useState<ZodiacSign | null>(null);
  const [signSheetVisible, setSignSheetVisible] = useState(false);
  const { horoscopes, loading, error, retry } = useBroadcastHoroscopes(source);
  const sign = pickedSign ?? zodiacSign ?? horoscopes[0]?.zodiac_sign;
  const horoscope = horoscopes.find(row => row.zodiac_sign === sign);
  const zodiac = sign ? ZODIAC_MAP[sign] : null;
  const { showToast, toastProps } = useToast();
  const { cardRef, share, sharing, saveImage, saving, mediaDeniedSheetVisible, closeMediaDeniedSheet } = useShareHoroscope({ showToast });
  const busy = sharing || saving;

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={goBack} style={styles.iconButton}>
          <Feather name="chevron-left" size={22} color={colors.textMid} />
        </Pressable>
        <Text style={styles.title}>{HOROSCOPE_SOURCE_LABELS[source]}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="운세 이미지 저장" disabled={!horoscope || busy} onPress={saveImage} style={styles.iconButton}>
          {saving ? <ActivityIndicator color={colors.apricotDark} /> : <Feather name="download" size={18} color={colors.apricotDark} />}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="운세 공유" disabled={!horoscope || busy} onPress={share} style={styles.iconButton}>
          {sharing ? <ActivityIndicator color={colors.apricotDark} /> : <Feather name="share-2" size={18} color={colors.apricotDark} />}
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {loading || zodiacLoading ? (
          <ActivityIndicator accessibilityLabel="운세 불러오는 중" color={colors.apricotDark} style={styles.status} />
        ) : error ? (
          <View style={styles.status}>
            <Text style={styles.message}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.message}>다시 시도</Text></Pressable>
          </View>
        ) : horoscope && zodiac ? (
          <>
            <View style={styles.dateRow}>
              <View style={styles.dateBadge}>
                <DatePill dateText={formatBroadcastDate(horoscope.date, source)} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`별자리 변경, 현재 ${zodiac.ko}`}
                accessibilityState={{ expanded: signSheetVisible, disabled: busy }}
                disabled={busy}
                onPress={() => setSignSheetVisible(true)}
                style={({ pressed }) => [styles.changeSign, pressed && styles.pressed]}
              >
                <Text style={styles.changeSignLabel}>별자리 변경</Text>
                <Feather name="chevron-down" size={12} color={colors.textSoft} />
              </Pressable>
            </View>
            <ZodiacHeroCircle zodiac={zodiac} rankPillText={`${isTodayHoroscope(horoscope.date) ? '오늘의 운세' : '그날의 운세'} ${horoscope.rank}위`} />
            {source === 'mezamashi' && horoscope.mezamashi ? (
              <MezamashiFortune horoscope={horoscope.mezamashi} showHeading={false} />
            ) : null}
            {source !== 'mezamashi' && (
              <>
                <HoroscopeCard advice={horoscope.advice_ko ?? horoscope.advice} horoscope={horoscope} style={styles.fortune} />
                <GogoInfoGrid horoscope={horoscope} style={styles.info} />
              </>
            )}
          </>
        ) : <Text style={[styles.message, styles.status]}>저장된 운세가 없어요.</Text>}
      </ScrollView>

      {!loading && horoscope && zodiac && (
        <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
          <ShareCard ref={cardRef} horoscope={horoscope} zodiac={zodiac} />
        </View>
      )}
      <BottomSheet visible={signSheetVisible} onClose={() => setSignSheetVisible(false)}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>별자리 선택</Text>
        <View style={styles.signGrid}>
          {ZODIAC_LIST.map(item => (
            <Pressable
              key={item.sign}
              accessibilityRole="button"
              accessibilityState={{ selected: sign === item.sign, disabled: busy }}
              disabled={busy}
              onPress={() => {
                setPickedSign(item.sign);
                setSignSheetVisible(false);
              }}
              style={({ pressed }) => [
                styles.sign,
                sign === item.sign && styles.selectedSign,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.signLabel, sign === item.sign && styles.selectedSignLabel]}>
                {item.ko}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
      <MediaDeniedSheet visible={mediaDeniedSheetVisible} onClose={closeMediaDeniedSheet} onOpenSettings={() => { Linking.openSettings(); closeMediaDeniedSheet(); }} />
      <Toast {...toastProps} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  invalid: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'NotoSansKR_400Regular', fontSize: 17, color: colors.textMid },
  scroll: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', flex: 1 },
  dateRow: { marginHorizontal: 28, marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8 },
  dateBadge: { minHeight: 44, justifyContent: 'center' },
  changeSign: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeSignLabel: { fontFamily: 'NotoSansKR_400Regular', fontSize: 11, color: colors.textSoft },
  pressed: { opacity: 0.65 },
  sheetHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.cream3, alignSelf: 'center', marginTop: -12, marginBottom: 20 },
  sheetTitle: { fontFamily: 'NotoSansKR_500Medium', fontSize: 16, lineHeight: 24, color: colors.textMid, marginBottom: 16 },
  signGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  sign: { width: '30%', flexGrow: 1, alignItems: 'center', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 14, backgroundColor: colors.cream2 },
  selectedSign: { backgroundColor: colors.cream3 },
  signLabel: { fontFamily: 'NotoSansKR_400Regular', fontSize: 12, color: colors.textSoft },
  selectedSignLabel: { color: colors.textMid },
  fortune: { marginHorizontal: 24, marginTop: 24 },
  info: { marginHorizontal: 24, marginTop: 12 },
  status: { margin: 32, alignItems: 'center' },
  message: { fontFamily: 'NotoSansKR_400Regular', fontSize: 13, lineHeight: 22, color: colors.textMid, textAlign: 'center' },
  retry: { padding: 14 },
  offscreen: { position: 'absolute', left: -9999, top: 0 },
});
