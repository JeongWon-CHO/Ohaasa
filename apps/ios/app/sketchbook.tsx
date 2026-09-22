import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResponsiveContainer } from '@/src/components/common/ResponsiveContainer';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { monthLabelKo } from '@/src/components/journal/MonthCalendar';
import { colors, radius, spacing } from '@/src/constants/design';
import { sampleJournalDraftForDate } from '@/src/constants/sampleDoodles';
import { daysInMonth, shiftMonth, toDateString, toYearMonth } from '@/src/lib/dateKeys';
import {
  clearAllJournals,
  loadJournal,
  loadJournalDates,
  saveJournal,
  type JournalDraft,
} from '@/src/lib/journal';

/** "최근 N개월"의 N. 보관함의 달 페이지네이션(2달씩)이 여러 번 돌아야 확인이 된다. */
const MONTHS_BACK = 6;

/** 매일 빠짐없이 쓴 달력은 현실이 아니라서, 빈칸이 섞인 모습으로 판단해야 한다. */
const SKIP_RATIO = 0.22;

/**
 * 개발용 화면 — **보기 위한 화면이 아니라 만들기 위한 도구다.**
 *
 * 달력은 홈 탭에, 그림 격자는 보관함 탭에 있다. 여기서까지 그리면 같은 뷰가
 * 세 벌이 되므로 조회는 전부 걷어내고 "채우기 / 지우기"만 남긴다.
 */
export default function SketchbookScreen() {
  const insets = useSafeAreaInsets();

  const today = toDateString(new Date());
  const [yearMonth, setYearMonth] = useState(() => toYearMonth(new Date()));
  const [dates, setDates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // 키 목록만 읽는다 — 개수만 필요한 자리에서 그림까지 역직렬화할 이유가 없다.
  const reload = useCallback(() => {
    loadJournalDates().then(setDates);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const monthCount = dates.filter((d) => d.startsWith(yearMonth)).length;

  const fill = useCallback(
    async (months: string[], draftFor: (date: string) => JournalDraft, skip: number) => {
      if (busy) return;
      setBusy(true);
      let written = 0;
      for (const ym of months) {
        for (const date of daysInMonth(ym)) {
          // 미래 날짜는 만들지 않는다 — 홈 달력의 onPressDay와 같은 규칙이다.
          if (date > today) continue;
          if (Math.random() < skip) continue;
          await saveJournal(date, draftFor(date));
          written += 1;
        }
      }
      setBusy(false);
      reload();
      Alert.alert('채웠어요', `${written}장을 만들었어요.`);
    },
    [busy, today, reload],
  );

  const fillMonth = useCallback(
    () => fill([yearMonth], sampleJournalDraftForDate, SKIP_RATIO),
    [fill, yearMonth],
  );

  const fillRecent = useCallback(() => {
    const nowMonth = toYearMonth(new Date());
    const months = Array.from({ length: MONTHS_BACK }, (_, i) =>
      shiftMonth(nowMonth, -i),
    );
    return fill(months, sampleJournalDraftForDate, SKIP_RATIO);
  }, [fill]);

  const fillWithMine = useCallback(async () => {
    const mine = await loadJournal(today);
    if (!mine) {
      Alert.alert('오늘 일기가 없어요', '홈에서 [오늘 일기 쓰기]로 먼저 한 장 남겨주세요.');
      return;
    }
    // 내 그림은 "이 그림이 격자에서 어떻게 보이나"를 확인하려는 거라 빈칸을 두지 않는다.
    await fill(
      [yearMonth],
      () => ({ mood: mine.mood, sketch: mine.sketch, summary: mine.summary }),
      0,
    );
  }, [fill, today, yearMonth]);

  const clearAll = useCallback(() => {
    Alert.alert('전부 지울까요?', '이 기기의 그림일기가 모두 사라져요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: async () => {
          const removed = await clearAllJournals();
          reload();
          Alert.alert('지웠어요', `${removed}장을 지웠어요.`);
        },
      },
    ]);
  }, [reload]);

  return (
    <ScreenBackground>
      <ResponsiveContainer>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>샘플 데이터</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <Text style={styles.total}>이 기기에 {dates.length}장</Text>

          <View style={styles.stepper}>
            <Pressable
              onPress={() => setYearMonth((ym) => shiftMonth(ym, -1))}
              hitSlop={12}
              style={styles.iconBtn}
            >
              <Feather name="chevron-left" size={20} color={colors.textMid} />
            </Pressable>
            <View style={styles.stepperLabel}>
              <Text style={styles.month}>{monthLabelKo(yearMonth)}</Text>
              <Text style={styles.monthCount}>{monthCount}장</Text>
            </View>
            <Pressable
              onPress={() => setYearMonth((ym) => shiftMonth(ym, 1))}
              hitSlop={12}
              style={styles.iconBtn}
            >
              <Feather name="chevron-right" size={20} color={colors.textMid} />
            </Pressable>
          </View>

          <Pressable onPress={fillMonth} disabled={busy} style={[styles.btn, busy && styles.btnBusy]}>
            <Text style={styles.btnText}>{monthLabelKo(yearMonth)} 채우기</Text>
          </Pressable>

          <Pressable onPress={fillRecent} disabled={busy} style={[styles.btn, busy && styles.btnBusy]}>
            <Text style={styles.btnText}>최근 {MONTHS_BACK}개월 채우기</Text>
          </Pressable>

          <Pressable
            onPress={fillWithMine}
            disabled={busy}
            style={[styles.btn, styles.btnGhost, busy && styles.btnBusy]}
          >
            <Text style={[styles.btnText, styles.btnGhostText]}>
              오늘 내 그림으로 이 달 채우기
            </Text>
          </Pressable>

          <Pressable onPress={clearAll} disabled={busy} style={[styles.btn, styles.btnDanger]}>
            <Text style={[styles.btnText, styles.btnDangerText]}>전부 지우기</Text>
          </Pressable>

          <Text style={styles.note}>
            미래 날짜는 만들지 않아요. 샘플은 {Math.round(SKIP_RATIO * 100)}%쯤 빈칸을 남겨요.
          </Text>
        </ScrollView>
      </ResponsiveContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  total: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    textAlign: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stepperLabel: {
    alignItems: 'center',
    minWidth: 120,
  },
  month: {
    fontSize: 17,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  monthCount: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  btn: {
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.action,
  },
  btnBusy: {
    opacity: 0.5,
  },
  btnGhost: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDanger: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.actionText,
  },
  btnGhostText: { color: colors.textMid },
  btnDangerText: { color: colors.trendDown },
  note: {
    marginTop: spacing.md,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    textAlign: 'center',
  },
});
