import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { BottomSheet } from "@/src/components/common/BottomSheet";
import { useAvailableHoroscopeDates } from "@/src/hooks/useAvailableHoroscopeDates";
import { colors, radius } from "@/src/constants/design";

interface HoroscopeDateSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string | null; // null = 최신
  onSelect: (date: string | null) => void; // null = 최신으로 리셋
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function formatSheetDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dow = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${month}월 ${day}일 ${dow}요일`;
}

export function HoroscopeDateSheet({
  visible,
  onClose,
  selectedDate,
  onSelect,
}: HoroscopeDateSheetProps) {
  const { dates, loading, error } = useAvailableHoroscopeDates();

  function isSelected(index: number, date: string): boolean {
    if (selectedDate === null) return index === 0; // null = 최신 = 첫 항목
    return date === selectedDate;
  }

  function handleSelect(date: string, index: number) {
    onSelect(index === 0 ? null : date); // 첫 항목 선택 = 최신으로 리셋
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>지난 운세 보기</Text>
      <Text style={styles.description}>보고 싶은 날짜를 선택해 주세요.</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.apricotDark} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>날짜 목록을 불러올 수 없어요.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {dates.map((date, index) => {
            const selected = isSelected(index, date);
            return (
              <Pressable
                key={date}
                style={({ pressed }) => [
                  styles.item,
                  selected && styles.itemSelected,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => handleSelect(date, index)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={styles.itemContent}>
                  {index === 0 && (
                    <View style={styles.latestBadge}>
                      <Text style={styles.latestBadgeText}>최신</Text>
                    </View>
                  )}
                  <Text style={[styles.dateLabel, selected && styles.dateLabelSelected]}>
                    {index === 0 ? '최신 운세' : formatSheetDate(date)}
                  </Text>
                </View>
                {selected && (
                  <Feather name="check" size={16} color={colors.apricotDark} />
                )}
              </Pressable>
            );
          })}
        </View>
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
  latestBadge: {
    backgroundColor: colors.apricot,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  latestBadgeText: {
    fontSize: 10,
    fontFamily: "NotoSansKR_600SemiBold",
    color: "#FFFDF9",
    lineHeight: 15,
  },
  dateLabel: {
    fontSize: 15,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
    lineHeight: 22,
  },
  dateLabelSelected: {
    fontFamily: "NotoSansKR_600SemiBold",
    color: colors.apricotDark,
  },
});
