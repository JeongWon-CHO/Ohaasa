import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResponsiveContainer } from '@/src/components/common/ResponsiveContainer';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { MoodFace, moodLevelFor } from '@/src/components/sketch/MoodFace';
import { SketchThumbnail } from '@/src/components/sketch/SketchThumbnail';
import { colors, layout, radius, spacing } from '@/src/constants/design';
import { loadJournal, type DailyJournal } from '@/src/lib/journal';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function formatFullDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAY_KO[new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 ${weekday}요일`;
}

/**
 * 남긴 하루를 읽는 화면.
 *
 * 작성 퍼널을 그대로 다시 보여주면 "읽는" 게 아니라 "다시 쓰는" 것이 된다.
 * 여기서는 한 장의 일기처럼 정리해 보여주고, 고치려면 [수정하기]로 퍼널에 들어간다.
 */
export default function JournalViewScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { date } = useLocalSearchParams<{ date: string }>();

  const [journal, setJournal] = useState<DailyJournal | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    loadJournal(date).then((loaded) => {
      if (cancelled) return;
      setJournal(loaded);
      setLoadedFor(date);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const innerWidth = Math.min(width, layout.maxContentWidth) - spacing.xl * 2;
  const isLoaded = loadedFor === date;

  return (
    <ScreenBackground>
      <ResponsiveContainer>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.spacer} />
          {journal && (
            <Pressable
              onPress={() =>
                router.replace({ pathname: '/journal-write', params: { date } })
              }
              hitSlop={12}
              style={styles.editBtn}
            >
              <Feather name="edit-2" size={13} color={colors.textMid} />
              <Text style={styles.editText}>수정</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          {!isLoaded ? null : !journal ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>아직 남긴 기록이 없어요</Text>
              <Pressable
                onPress={() =>
                  router.replace({ pathname: '/journal-write', params: { date } })
                }
                style={styles.writeBtn}
              >
                <Text style={styles.writeText}>이 날 일기 쓰기</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.date}>{formatFullDate(journal.date)}</Text>

              {/* 그림이 본문이다 — 가장 크게, 가운데. 기분·글은 그 아래에 붙는다. */}
              <SketchThumbnail sketch={journal.sketch} size={innerWidth} />

              <View style={styles.moodRow}>
                <MoodFace mood={journal.mood} size={34} />
                <Text style={styles.moodLabel}>{moodLevelFor(journal.mood).label}</Text>
              </View>

              {journal.summary.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.summary}>{journal.summary}</Text>
                </>
              )}
            </>
          )}
        </ScrollView>
      </ResponsiveContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  spacer: { flex: 1 },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
  },
  content: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  date: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  /** 기분과 일기 사이. 가로로 꽉 채우면 칸이 나뉘어 보여서 짧게 가운데만 긋는다. */
  divider: {
    width: '32%',
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(156,139,120,0.28)',
    // 컨테이너 gap(16) 위에 얹는다 — 선 양옆이 24씩 벌어진다.
    marginVertical: spacing.sm,
  },
  summary: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  moodLabel: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  writeBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    backgroundColor: colors.action,
  },
  writeText: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.actionText,
  },
});
