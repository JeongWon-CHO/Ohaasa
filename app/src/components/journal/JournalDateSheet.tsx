import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/src/components/common/BottomSheet';
import { colors, spacing } from '@/src/constants/design';
import { daysInMonth, shiftMonth } from '@/src/lib/dateKeys';

export function JournalDateSheet({ date, onSelect, onClose }: {
  date: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(date.slice(0, 7));
  const [year, monthNumber] = month.split('-').map(Number);
  const leading = new Date(year, monthNumber - 1, 1).getDay();
  const days = [...Array<string | null>(leading).fill(null), ...daysInMonth(month)];

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.row}>
        <Text style={styles.title}>일기 날짜 바꾸기</Text>
        <Pressable onPress={onClose} accessibilityLabel="닫기" hitSlop={12}>
          <Feather name="x" size={22} color={colors.textMid} />
        </Pressable>
      </View>
      <Text style={styles.hint}>그림과 글은 그대로 두고 날짜만 바꿔요.</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} accessibilityLabel="이전 달" style={styles.nav}>
          <Feather name="chevron-left" size={22} color={colors.textMid} />
        </Pressable>
        <Text style={styles.title}>{year}년 {monthNumber}월</Text>
        <Pressable onPress={() => setMonth(shiftMonth(month, 1))} accessibilityLabel="다음 달" style={styles.nav}>
          <Feather name="chevron-right" size={22} color={colors.textMid} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <View key={day} style={styles.cell}><Text style={styles.hint}>{day}</Text></View>
        ))}
        {days.map((day, index) => day ? (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityLabel={`${year}년 ${monthNumber}월 ${Number(day.slice(8))}일`}
            accessibilityState={{ selected: day === date }}
            onPress={() => onSelect(day)}
            style={[styles.cell, day === date && styles.selected]}
          >
            <Text style={styles.title}>{Number(day.slice(8))}</Text>
          </Pressable>
        ) : <View key={`empty-${index}`} style={styles.cell} />)}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, color: colors.text, fontFamily: 'NotoSansKR_500Medium' },
  hint: { fontSize: 13, color: colors.textMid, marginVertical: spacing.sm },
  nav: { padding: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', height: 44, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.action, borderRadius: 22 },
});
