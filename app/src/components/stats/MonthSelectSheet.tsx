import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { format, getDaysInMonth, parseISO } from "date-fns";

import { BottomSheet } from "@/src/components/common/BottomSheet";
import { colors, radius } from "@/src/constants/design";
import { fetchHoroscopeDates } from "@/src/lib/supabase";
import type { MonthKey } from "@/src/hooks/useHoroscopeTrends";

interface MonthSelectSheetProps {
  visible: boolean;
  selectedMonth: MonthKey | null;
  onClose: () => void;
  onSelect: (month: MonthKey) => void;
}

interface MonthSummary {
  month: MonthKey;
  /** 그 달에 실제로 데이터가 있는 날 수. */
  dayCount: number;
  isCurrent: boolean;
}

/**
 * 달마다 며칠치가 있는지까지 세어 최신순으로 묶는다.
 *
 * 데이터가 있는 달만 나온다 — 서비스 시작 전 달이나 크롤러가 통째로 쉰 달을
 * "0일치"로 보여줄 이유가 없다.
 */
function summarize(dates: string[], today: Date): MonthSummary[] {
  const currentMonth = format(today, "yyyy-MM");
  const counts = new Map<MonthKey, number>();

  for (const date of dates) {
    const month = date.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, dayCount]) => ({ month, dayCount, isCurrent: month === currentMonth }));
}

function formatMonthLabel(month: MonthKey): string {
  const [year, monthNum] = month.split("-").map(Number);
  return `${year}년 ${monthNum}월`;
}

/**
 * 일수는 "덜 찬 달"에만 붙인다. 지난 달이 30일 중 30일이면 굳이 말할 게 없고,
 * 이번 달은 원래 채워지는 중이라 항상 덜 찬 상태다 — 대신 [이번 달] 배지가 그 자리다.
 */
function partialDayCount(summary: MonthSummary): number | null {
  if (summary.isCurrent) return null;
  const full = getDaysInMonth(parseISO(`${summary.month}-01`));
  return summary.dayCount < full ? summary.dayCount : null;
}

export function MonthSelectSheet({
  visible,
  selectedMonth,
  onClose,
  onSelect,
}: MonthSelectSheetProps) {
  const [months, setMonths] = useState<MonthSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // 시트는 닫혀 있어도 마운트돼 있다 — 열 때만 조회한다.
    if (!visible || months !== null) return;

    let cancelled = false;
    fetchHoroscopeDates().then((dates) => {
      if (cancelled) return;
      if (!dates || dates.length === 0) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setMonths(summarize(dates, new Date()));
    });

    return () => {
      cancelled = true;
    };
  }, [visible, months]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>월별 평균 등수</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Feather name="x" size={20} color={colors.textSoft} />
        </Pressable>
      </View>
      <Text style={styles.description}>지난 달의 평균 순위도 다시 볼 수 있어요.</Text>

      {failed ? (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>달 목록을 불러올 수 없어요.</Text>
        </View>
      ) : months === null ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.apricotDark} />
        </View>
      ) : (
        // 달은 매달 하나씩 늘어난다. 시트 높이는 고정이라 목록이 직접 스크롤해야
        // 오래된 달이 화면 밖으로 잘려 나가지 않는다.
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {months.map((summary) => {
            const selected = summary.month === selectedMonth;
            const partial = partialDayCount(summary);
            return (
              <Pressable
                key={summary.month}
                onPress={() => {
                  onSelect(summary.month);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.item,
                  selected && styles.itemSelected,
                  pressed && styles.itemPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                {summary.isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>이번 달</Text>
                  </View>
                )}
                <Text style={[styles.itemLabel, selected && styles.itemLabelSelected]}>
                  {formatMonthLabel(summary.month)}
                </Text>
                {partial !== null && <Text style={styles.partialText}>{partial}일치</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontFamily: "NotoSansKR_700Bold",
    color: colors.text,
    lineHeight: 25,
  },
  description: {
    fontSize: 13,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 12,
  },
  stateBox: {
    alignItems: "center",
    paddingVertical: 24,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.apricotDark,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    paddingBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  itemSelected: {
    backgroundColor: "rgba(217,138,104,0.10)",
  },
  itemPressed: {
    backgroundColor: "rgba(44,36,22,0.05)",
  },
  currentBadge: {
    backgroundColor: colors.apricot,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  currentBadgeText: {
    fontSize: 10,
    lineHeight: 15,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_600SemiBold",
    color: "#FFFDF9",
  },
  itemLabel: {
    fontSize: 15,
    lineHeight: 22,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
  },
  itemLabelSelected: {
    fontFamily: "NotoSansKR_600SemiBold",
    color: colors.apricotDark,
  },
  partialText: {
    fontSize: 11,
    lineHeight: 16,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
  },
});
