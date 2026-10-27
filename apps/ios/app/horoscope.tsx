import { BroadcastPicker } from '@/src/components/BroadcastPicker';
import { MezamashiFortune } from '@/src/components/MezamashiFortune';
import { isTodayHoroscope } from '@ohaasa/shared/lib/horoscopeDate';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StarfieldDeco } from '@/src/components/final/ScreenDeco';
import { DatePill } from '@/src/components/final/DatePill';
import { FinalCard } from '@/src/components/final/FinalCard';
import { FinalHeader } from '@/src/components/final/FinalHeader';
import { GogoInfoGrid } from '@/src/components/final/GogoInfoGrid';
import { ZodiacHeroCircle } from '@/src/components/final/ZodiacHeroCircle';
import { HoroscopeCard } from '@/src/components/HoroscopeCard';
import { HoroscopeDateSheet } from '@/src/components/HoroscopeDateSheet';
import { MediaDeniedSheet } from '@/src/components/MediaDeniedSheet';
import { PushPermissionSheet } from '@/src/components/PushPermissionSheet';
import { ShareCard } from '@/src/components/share/ShareCard';
import { Toast } from '@/src/components/common/Toast';
import { useHoroscopeDateContext } from '@ohaasa/shared/context/HoroscopeDateContext';
import { colors, gradients, layout, spacing } from '@/src/constants/design';
import { ZODIAC_MAP } from '@ohaasa/shared/constants/zodiac';
import { useAllHoroscopes } from '@ohaasa/shared/hooks/useHoroscope';
import {
  getDailyReview,
  type DailyReview,
} from '@ohaasa/shared/lib/dailyReviews';
import { usePushPermissionPrompt } from '@/src/hooks/usePushPermissionPrompt';
import { useShareHoroscope } from '@ohaasa/shared/hooks/useShareHoroscope';
import { useToast } from '@ohaasa/shared/hooks/useToast';
import { useZodiac } from '@ohaasa/shared/hooks/useZodiac';

const COPY = {
  headerToday: '오늘도 좋은 하루 되세요 ☀️',
  headerPast: '그날의 운세를 다시 보고 있어요 ✨',
  noZodiac: '별자리를 선택해주세요.',
  noData: '방송 데이터가 없습니다.',
  noDateData: '해당 날짜에 저장된 운세가 없어요.\n다른 날짜를 선택해 주세요.',
};

function HoroscopeMenuRow({
  icon,
  title,
  status,
  onPress,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  status?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        pressed && styles.menuRowPressed,
      ]}
    >
      <Feather name={icon} size={18} color={colors.apricotDark} />
      <Text style={styles.menuTitle}>{title}</Text>
      {status && <Text style={styles.menuStatus}>{status}</Text>}
      <Feather name="chevron-right" size={16} color={colors.textSoft} />
    </Pressable>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { showToast, toastProps } = useToast();
  const {
    cardRef,
    share,
    sharing,
    saveImage,
    saving,
    mediaDeniedSheetVisible,
    closeMediaDeniedSheet,
  } = useShareHoroscope({
    showToast,
  });

  const { selectedDate, setSelectedDate } = useHoroscopeDateContext();

  const {
    zodiacSign,
    loading: zodiacLoading,
    error: zodiacError,
  } = useZodiac();
  const {
    horoscopes,
    broadcastDate,
    loading: horoscopeLoading,
    error: horoscopeError,
  } = useAllHoroscopes({ date: selectedDate });

  const loading = zodiacLoading || horoscopeLoading;
  const error = zodiacError ?? horoscopeError;
  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const horoscope = zodiacSign
    ? (horoscopes.find((h) => h.zodiac_sign === zodiacSign) ?? null)
    : null;

  // 빈 상태 문구: 별자리 없음 / 특정 날짜에 데이터 없음 / 최신 데이터 없음
  const emptyText =
    zodiacSign === null
      ? COPY.noZodiac
      : selectedDate !== null && horoscopes.length === 0
        ? COPY.noDateData
        : COPY.noData;

  const scrollRef = useRef<ScrollView>(null);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [currentReview, setCurrentReview] = useState<DailyReview | null>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  // 날짜를 먼저 꺼내둔다 — 본문에서 horoscope를 통째로 참조하면
  // 추론된 의존성이 horoscope 객체가 되어 실제 deps와 어긋난다.
  const horoscopeDate = horoscope?.date ?? null;
  useFocusEffect(
    useCallback(() => {
      if (!horoscopeDate || !zodiacSign) {
        setCurrentReview(null);
        return;
      }
      getDailyReview(horoscopeDate, zodiacSign).then(setCurrentReview);
    }, [horoscopeDate, zodiacSign]),
  );

  const { pushSheetVisible, handlePushAccept, handlePushDecline } =
    usePushPermissionPrompt({ loading, zodiacSign });

  const isToday = isTodayHoroscope(horoscope?.date);
  const rankPillText = isToday
    ? `오늘의 운세 ${horoscope?.rank}위`
    : `그날의 운세 ${horoscope?.rank}위`;

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      {/* Background decorations — 홈도 같은 세트를 쓴다 */}
      <StarfieldDeco />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={styles.scroll}
      >
        {/* Header */}
        <FinalHeader
          leadingAction={<BroadcastPicker currentSource={horoscope?.source} />}
          onBackPress={() => router.back()}
          title="ohaasa"
          subtitle={!horoscope || isToday ? COPY.headerToday : COPY.headerPast}
          onSharePress={horoscope ? share : undefined}
          sharing={sharing}
          onSavePress={horoscope ? saveImage : undefined}
          saving={saving}
        />

        {/* DatePill */}
        <View style={styles.pillWrap}>
          <DatePill
            dateText={broadcastDate ?? ''}
            onPress={() => setDateSheetVisible(true)}
          />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.apricotDark} size="large" />
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : zodiac && horoscope ? (
          <>
            <ZodiacHeroCircle zodiac={zodiac} rankPillText={rankPillText} />

            {/* Fortune card */}
            {horoscope.source === 'mezamashi' && horoscope.mezamashi ? (
              <MezamashiFortune
                horoscope={horoscope.mezamashi}
                showHeading={false}
              />
            ) : (
              <>
                <HoroscopeCard
                  advice={horoscope.advice_ko ?? horoscope.advice}
                  horoscope={horoscope}
                  style={styles.fortuneCard}
                />
                <GogoInfoGrid horoscope={horoscope} style={styles.infoGrid} />
              </>
            )}

            <FinalCard style={styles.menuCard}>
              <HoroscopeMenuRow
                icon="award"
                title="전체 순위"
                onPress={() => router.push('/rankings')}
              />
              <HoroscopeMenuRow
                icon="bar-chart-2"
                title="운세 통계"
                onPress={() => router.push('/stats')}
              />
              <View style={styles.menuDivider} />
              <HoroscopeMenuRow
                icon="moon"
                title="운세 리뷰"
                status={currentReview !== null ? '작성 완료' : undefined}
                onPress={() => router.push('/daily-review')}
              />
            </FinalCard>
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        )}
      </ScrollView>

      {/* 오프스크린 캡처용 ShareCard */}
      {zodiac && horoscope && (
        <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
          <ShareCard ref={cardRef} horoscope={horoscope} zodiac={zodiac} />
        </View>
      )}

      <Toast {...toastProps} />

      <PushPermissionSheet
        visible={pushSheetVisible}
        onAccept={handlePushAccept}
        onDecline={handlePushDecline}
      />

      <MediaDeniedSheet
        visible={mediaDeniedSheetVisible}
        onClose={closeMediaDeniedSheet}
        onOpenSettings={() => {
          Linking.openSettings();
          closeMediaDeniedSheet();
        }}
      />

      <HoroscopeDateSheet
        visible={dateSheetVisible}
        onClose={() => setDateSheetVisible(false)}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  menuCard: {
    marginTop: 16,
    marginHorizontal: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.md,
  },
  menuRowPressed: {
    opacity: 0.6,
  },
  menuTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
  },
  menuStatus: {
    fontSize: 11,
    lineHeight: 17,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cream3,
    marginVertical: spacing.xs,
  },
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  content: {},

  pillWrap: {
    marginTop: 12,
    marginHorizontal: 28,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    marginTop: 28,
  },

  fortuneCard: {
    marginHorizontal: 24,
    marginTop: 24,
  },

  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginHorizontal: 24,
  },

  emptyWrap: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMid,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    color: colors.apricotDark,
    fontSize: 13,
    textAlign: 'center',
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
});
