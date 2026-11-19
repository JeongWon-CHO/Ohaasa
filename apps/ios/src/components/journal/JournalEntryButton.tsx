import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '@/src/constants/design';
import { toDateString } from '@/src/lib/dateKeys';
import { loadJournal } from '@/src/lib/journal';

/** 운세를 본 날짜의 그림일기로 연결하고, 작성 후 복귀할 때 다시 확인한다. */
export function JournalEntryButton({ date }: { date: string }) {
  const [result, setResult] = useState<{
    date: string;
    exists: boolean;
    failed: boolean;
  } | null>(null);
  const requestId = useRef(0);
  const refresh = useCallback(() => {
    const currentRequest = ++requestId.current;
    setResult(null);
    loadJournal(date).then(
      (journal) => {
        if (requestId.current === currentRequest) {
          setResult({ date, exists: journal !== null, failed: false });
        }
      },
      () => {
        if (requestId.current === currentRequest) {
          setResult({ date, exists: false, failed: true });
        }
      },
    );
  }, [date]);

  useFocusEffect(useCallback(() => {
    refresh();
    // 재시도·날짜 변경·화면 이탈 전의 응답이 현재 버튼을 덮지 않게 한다.
    return () => { requestId.current += 1; };
  }, [refresh]));

  const today = toDateString(new Date());
  // 아직 오지 않은 날짜에는 일기를 만들 수 없다.
  if (date > today) return null;
  const ready = result?.date === date;
  const label = !ready
    ? '일기 확인 중…'
    : result.failed
      ? '일기 다시 확인'
      : `${date === today ? '오늘' : '이날'} 일기 ${result.exists ? '보기' : '쓰기'}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!ready}
      onPress={() => {
        if (!ready) return;
        if (result.failed) {
          refresh();
          return;
        }
        router.push({
          pathname: result.exists ? '/journal-view' : '/journal-write',
          params: { date },
        });
      }}
      style={({ pressed }) => [styles.button, (!ready || pressed) && styles.dimmed]}
    >
      <Feather name="edit-3" size={14} color={colors.actionText} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: spacing.xs,
    paddingHorizontal: 24,
    paddingVertical: 6,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.action,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.actionText,
  },
  dimmed: { opacity: 0.65 },
});
