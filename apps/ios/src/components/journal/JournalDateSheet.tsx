import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/common/BottomSheet";
import { colors, spacing } from "@/src/constants/design";
import { daysInMonth, shiftMonth, toDateString } from "@/src/lib/dateKeys";
import { assertJournalDateAvailable } from "@/src/lib/journal";

export function JournalDateSheet({
  date,
  sourceDate,
  onSelect,
  onClose,
}: {
  date: string;
  sourceDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const today = toDateString(new Date());
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState((date > today ? today : date).slice(0, 7));
  const [checking, setChecking] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const selectDate = async (selected: string) => {
    if (pending.current) return;
    pending.current = true;
    setChecking(true);
    try {
      await assertJournalDateAvailable(selected, sourceDate);
      if (mounted.current) onSelect(selected);
    } catch (error) {
      if (mounted.current) {
        Alert.alert(
          "날짜를 선택할 수 없어요",
          error instanceof Error &&
            (error.message.includes("이미 일기") ||
              error.message.includes("미래 날짜"))
            ? error.message
            : "일기 날짜를 확인하지 못했어요.\n다시 선택해 주세요.",
        );
      }
    } finally {
      pending.current = false;
      if (mounted.current) setChecking(false);
    }
  };
  const [year, monthNumber] = month.split("-").map(Number);
  const leading = new Date(year, monthNumber - 1, 1).getDay();
  const days = [
    ...Array<string | null>(leading).fill(null),
    ...daysInMonth(month),
  ];

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.row}>
        <Text style={styles.title}>일기 날짜 바꾸기</Text>
        <Pressable onPress={onClose} accessibilityLabel="닫기" hitSlop={12}>
          <Feather name="x" size={22} color={colors.textMid} />
        </Pressable>
      </View>
      <View style={[styles.row, styles.monthRow]}>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, -1))}
          accessibilityLabel="이전 달"
          style={styles.nav}
        >
          <Feather name="chevron-left" size={22} color={colors.textMid} />
        </Pressable>
        <Text style={styles.title}>
          {year}년 {monthNumber}월
        </Text>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, 1))}
          accessibilityLabel="다음 달"
          accessibilityState={{ disabled: month >= currentMonth }}
          disabled={month >= currentMonth}
          style={[styles.nav, month >= currentMonth && styles.disabled]}
        >
          <Feather name="chevron-right" size={22} color={colors.textMid} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <View key={day} style={styles.cell}>
            <Text style={styles.hint}>{day}</Text>
          </View>
        ))}
        {days.map((day, index) =>
          day ? (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`${year}년 ${monthNumber}월 ${Number(day.slice(8))}일`}
              accessibilityState={{
                selected: day === date,
                disabled: checking || day > today,
              }}
              disabled={checking || day > today}
              onPress={() => {
                void selectDate(day);
              }}
              style={[
                styles.cell,
                day === date && styles.selected,
                day > today && styles.disabled,
              ]}
            >
              <Text style={styles.title}>{Number(day.slice(8))}</Text>
            </Pressable>
          ) : (
            <View key={`empty-${index}`} style={styles.cell} />
          ),
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  monthRow: { marginVertical: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    color: colors.text,
    fontFamily: "NotoSansKR_500Medium",
  },
  hint: { fontSize: 13, color: colors.textMid, marginVertical: spacing.sm },
  nav: { padding: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.285714%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: colors.action, borderRadius: 22 },
  disabled: { opacity: 0.3 },
});
