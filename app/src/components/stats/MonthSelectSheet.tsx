import { format } from "date-fns";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { BottomSheet } from "@/src/components/common/BottomSheet";
import { colors, radius } from "@/src/constants/design";
import { useAvailableHoroscopeMonths } from "@/src/hooks/useAvailableHoroscopeMonths";
import { formatMonthLabel } from "@/src/hooks/useHoroscopeTrends";

interface MonthSelectSheetProps {
  visible: boolean;
  selectedMonth: string | null; // "YYYY-MM"
  onClose: () => void;
  onSelect: (month: string) => void;
}

function daysInMonth(month: string): number {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum, 0).getDate();
}

export function MonthSelectSheet({ visible, selectedMonth, onClose, onSelect }: MonthSelectSheetProps) {
  const { months, loading, error } = useAvailableHoroscopeMonths(visible);
  const currentMonth = format(new Date(), "yyyy-MM");

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>월별 평균 등수</Text>
      <Text style={styles.description}>지난 달의 평균 순위도 다시 볼 수 있어요.</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.apricotDark} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>월 목록을 불러올 수 없어요.</Text>
        </View>
      ) : months.length === 0 ? (
        <View style={styles.errorBox}>
          <Text style={styles.emptyText}>아직 쌓인 운세가 없어요.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {months.map((item) => {
            const selected = item.month === selectedMonth;
            // 크롤링이 달 중간에 시작됐거나 아직 진행 중인 달은 일수를 알려준다
            const partial = item.dayCount < daysInMonth(item.month);
            return (
              <Pressable
                key={item.month}
                style={({ pressed }) => [styles.item, selected && styles.itemSelected, pressed && styles.itemPressed]}
                onPress={() => {
                  onSelect(item.month);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={styles.itemContent}>
                  {item.month === currentMonth && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>이번 달</Text>
                    </View>
                  )}
                  <Text style={[styles.monthLabel, selected && styles.monthLabelSelected]}>
                    {formatMonthLabel(item.month)}
                  </Text>
                  {partial && <Text style={styles.dayCount}>{item.dayCount}일치</Text>}
                </View>
                {selected && <Feather name="check" size={16} color={colors.apricotDark} />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontFamily: "NotoSansKR_700Bold",
    color: colors.text,
    lineHeight: 28,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
    lineHeight: 20,
    marginBottom: 20,
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 24,
  },
  errorBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 13,
    color: colors.apricotDark,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMid,
  },
  // 달이 쌓일수록 목록이 길어지므로 시트 안에서 스크롤시킨다
  scroll: {
    maxHeight: 360,
  },
  list: {
    gap: 4,
    paddingBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  itemSelected: {
    backgroundColor: "rgba(217,138,104,0.10)",
  },
  itemPressed: {
    backgroundColor: "rgba(44,36,22,0.05)",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentBadge: {
    backgroundColor: colors.apricot,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: "NotoSansKR_600SemiBold",
    color: "#FFFDF9",
    lineHeight: 15,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
    lineHeight: 22,
  },
  monthLabelSelected: {
    fontFamily: "NotoSansKR_600SemiBold",
    color: colors.apricotDark,
  },
  dayCount: {
    fontSize: 11,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    lineHeight: 16,
  },
});
