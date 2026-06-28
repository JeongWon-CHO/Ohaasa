import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Svg, { Path, Polygon } from "react-native-svg";

import { DatePill } from "@/src/components/final/DatePill";
import { FinalHeader } from "@/src/components/final/FinalHeader";
import { HoroscopeDateSheet } from "@/src/components/HoroscopeDateSheet";
import { RankingRow } from "@/src/components/final/RankingRow";
import { useHoroscopeDateContext } from "@/src/context/HoroscopeDateContext";
import { colors, gradients } from "@/src/constants/design";
import { useAllHoroscopes } from "@/src/hooks/useHoroscope";
import { useZodiac } from "@/src/hooks/useZodiac";

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

// ─── Screen ───────────────────────────────────────────────────

export default function RankingsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { zodiacSign } = useZodiac();
  const { selectedDate, isLatest, setSelectedDate } = useHoroscopeDateContext();
  const { horoscopes, broadcastDate, loading, error } = useAllHoroscopes({ date: selectedDate });
  const navigatingRef = useRef(false);
  const multiTouchRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const prevZodiacRef = useRef(zodiacSign);

  const [dateSheetVisible, setDateSheetVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    navigatingRef.current = false;
    multiTouchRef.current = false;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  useEffect(() => {
    if (prevZodiacRef.current !== zodiacSign) {
      prevZodiacRef.current = zodiacSign;
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [zodiacSign]);

  const sectionTitle = isLatest ? "오늘의 전체 순위" : "그날의 전체 순위";

  // 날짜에 데이터가 없을 때 문구
  const noDataText =
    selectedDate !== null && horoscopes.length === 0 && !loading
      ? "해당 날짜에 저장된 운세가 없어요.\n다른 날짜를 선택해 주세요."
      : "방송 데이터가 없습니다.";

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <CircleDeco x={-50} y={50} size={170} color={colors.sky} opacity={0.11} />
      <CircleDeco
        x={230}
        y={-30}
        size={160}
        color={colors.yellow}
        opacity={0.1}
      />
      <CircleDeco
        x={200}
        y={590}
        size={160}
        color={colors.apricot}
        opacity={0.1}
      />
      <StarDeco x={46} y={128} size={5} color={colors.yellow} opacity={0.26} />
      <StarDeco
        x={294}
        y={108}
        size={4}
        color={colors.apricot}
        opacity={0.22}
      />
      <StarDeco x={28} y={440} size={3} color={colors.yellow} opacity={0.18} />
      <MoonDeco
        x={286}
        y={174}
        size={22}
        color={colors.apricot}
        opacity={0.18}
      />

      {/* Header */}
      <FinalHeader subtitle="12개 별자리 오하아사 순위" />

      {/* DatePill */}
      <View style={styles.pillWrap}>
        <DatePill
          dateText={broadcastDate ?? ""}
          onPress={() => setDateSheetVisible(true)}
        />
      </View>

      {/* Section title */}
      <View style={styles.titleWrap}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.apricotDark} size="large" />
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : horoscopes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{noDataText}</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          onTouchStart={(e) => {
            if (e.nativeEvent.touches.length > 1) {
              multiTouchRef.current = true;
            }
          }}
          onTouchEnd={(e) => {
            const remaining = e.nativeEvent.touches.length - e.nativeEvent.changedTouches.length;
            if (remaining <= 0) {
              requestAnimationFrame(() => {
                multiTouchRef.current = false;
              });
            }
          }}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabBarHeight + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {horoscopes.map((horoscope) => (
            <RankingRow
              horoscope={horoscope}
              isMine={horoscope.zodiac_sign === zodiacSign}
              key={horoscope.zodiac_sign}
              onPress={() => {
                if (navigatingRef.current || multiTouchRef.current) return;
                navigatingRef.current = true;
                router.push({
                  pathname: "/zodiac/[sign]",
                  params: {
                    sign: horoscope.zodiac_sign,
                    ...(selectedDate ? { date: selectedDate } : {}),
                  },
                });
              }}
            />
          ))}
          <View style={styles.spacer} />
        </ScrollView>
      )}

      <HoroscopeDateSheet
        visible={dateSheetVisible}
        onClose={() => setDateSheetVisible(false)}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: "hidden",
  },
  pillWrap: {
    marginTop: 12,
    marginHorizontal: 28,
    zIndex: 1,
  },
  titleWrap: {
    marginTop: 10,
    marginHorizontal: 28,
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.text,
    paddingTop: 6,
    paddingBottom: 6,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMid,
    textAlign: "center",
    lineHeight: 22,
  },
  errorText: {
    fontSize: 13,
    color: colors.apricotDark,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 7,
  },
  spacer: {
    minHeight: 20,
  },
});
