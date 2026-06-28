import { forwardRef, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { format, parseISO } from "date-fns";

import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { RankTrendChart } from "@/src/components/stats/RankTrendChart";
import { colors, gradients } from "@/src/constants/design";
import type { ZodiacInfo } from "@/src/constants/zodiac";
import { getSummaryComment, type RankPoint, type TrendsPeriod } from "@/src/hooks/useHoroscopeTrends";

export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 640;

const BADGE_SIZE = 24;
const CHART_WIDTH = 272;
const CHART_HEIGHT = 150;

interface StatsShareCardProps {
  zodiac: ZodiacInfo;
  period: TrendsPeriod;
  points: RankPoint[];
  averageRank: number;
}

function formatShareDateRange(points: RankPoint[]): string {
  const start = parseISO(points[0].date);
  const end = parseISO(points[points.length - 1].date);
  return `${format(start, "MM.dd")} – ${format(end, "MM.dd")}`;
}

function HairlineLabel({ children }: { children: ReactNode }) {
  return (
    <View style={styles.hairlineRow}>
      <View style={styles.hairline} />
      <Text style={styles.hairlineText} allowFontScaling={false}>
        {children}
      </Text>
      <View style={styles.hairline} />
    </View>
  );
}

export const StatsShareCard = forwardRef<View, StatsShareCardProps>(
  ({ zodiac, period, points, averageRank }, ref) => {
    const lastPoint = points[points.length - 1];
    const isLatestToday = lastPoint.date === format(new Date(), "yyyy-MM-dd");
    const latestLabel = isLatestToday ? "오늘" : "최근";
    const periodDays = period === "7d" ? 7 : 30;
    const comment = getSummaryComment(averageRank);
    const dateRangeLabel = formatShareDateRange(points);

    return (
      <View ref={ref} style={styles.wrapper} collapsable={false}>
        <LinearGradient colors={gradients.screen} style={styles.card}>
          <View style={styles.content}>
            {/* 브랜드 */}
            <View style={styles.brandBlock}>
              <Text style={styles.brand} allowFontScaling={false}>
                ohaasa
              </Text>
              <HairlineLabel>최근 {periodDays}일 운세 흐름</HairlineLabel>
            </View>

            {/* 별자리 네임택 */}
            <View style={styles.nameTag}>
              <View style={styles.nameTagBadge}>
                <ConstellationBadge sign={zodiac.sign} size={BADGE_SIZE} />
              </View>
              <Text style={styles.zodiacName} allowFontScaling={false}>
                {zodiac.ko}
              </Text>
            </View>

            {/* 핵심 통계 */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel} allowFontScaling={false}>
                  평균
                </Text>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, styles.metricValueAccent]} allowFontScaling={false}>
                    {averageRank.toFixed(1)}
                  </Text>
                  <Text style={styles.metricUnit} allowFontScaling={false}>
                    위
                  </Text>
                </View>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel} allowFontScaling={false}>
                  {latestLabel}
                </Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue} allowFontScaling={false}>
                    {lastPoint.rank}
                  </Text>
                  <Text style={styles.metricUnit} allowFontScaling={false}>
                    위
                  </Text>
                </View>
              </View>
            </View>

            {/* 감성 코멘트 */}
            <View style={styles.callout}>
              <Text style={styles.calloutEmoji} allowFontScaling={false}>
                🌤️
              </Text>
              <Text style={styles.calloutText} allowFontScaling={false} numberOfLines={2}>
                {comment}
              </Text>
            </View>

            {/* 그래프 카드 */}
            <View style={styles.chartCard}>
              <RankTrendChart points={points} width={CHART_WIDTH} height={CHART_HEIGHT} />
            </View>

            {/* 기간 */}
            <Text style={styles.period} allowFontScaling={false}>
              {dateRangeLabel}
            </Text>

            {/* 하단 문구 */}
            <HairlineLabel>
              매일 아침 만나는 별자리 운세, <Text style={styles.footerAccent}>ohaasa</Text>
            </HairlineLabel>
          </View>
        </LinearGradient>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 84,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  brandBlock: {
    alignItems: "center",
    gap: 6,
  },
  brand: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "NotoSansKR_300Light",
    includeFontPadding: false,
    color: colors.text,
    letterSpacing: 3.4,
  },
  hairlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  hairline: {
    width: 18,
    height: 1,
    backgroundColor: colors.cream3,
  },
  hairlineText: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
    letterSpacing: 3.7,
    textAlign: "center",
  },
  footerAccent: {
    fontFamily: "NotoSansKR_500Medium",
    color: colors.apricotDark,
    letterSpacing: 0,
  },
  nameTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,253,249,0.7)",
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  nameTagBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  zodiacName: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "NotoSansKR_300Light",
    includeFontPadding: false,
    color: colors.textMid,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  metricCol: {
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  metricLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  metricValue: {
    fontSize: 46,
    lineHeight: 52,
    fontFamily: "NotoSansKR_700Bold",
    includeFontPadding: false,
    color: colors.text,
  },
  metricValueAccent: {
    color: colors.apricotDark,
  },
  metricUnit: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textMid,
    marginBottom: 6,
  },
  callout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217,138,104,0.16)",
    backgroundColor: "rgba(245,217,139,0.18)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    maxWidth: "100%",
  },
  calloutEmoji: {
    fontSize: 14,
  },
  calloutText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
    textAlign: "center",
  },
  chartCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "rgba(255,253,249,0.62)",
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  period: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textMid,
    letterSpacing: 0.4,
  },
});
