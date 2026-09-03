import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArchiveMonthHeader,
  ArchiveRow,
  cellSizeFor,
  chunkRows,
  columnsFor,
} from '@/src/components/archive/ArchiveGrid';
import { ResponsiveContainer } from '@/src/components/common/ResponsiveContainer';
import { FinalHeader } from '@/src/components/final/FinalHeader';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { monthLabelKo } from '@/src/components/journal/MonthCalendar';
import { colors, layout, radius, spacing } from '@/src/constants/design';
import { useJournalArchive } from '@/src/hooks/useJournalArchive';
import type { DailyJournal } from '@/src/lib/journal';

/**
 * 보관함 = 쌓인 그림.
 *
 * 홈 달력과 역할이 겹치지 않게 나눈다 — 달력은 "이번 달을 채우는" 자리고,
 * 여기는 "지금까지 그린 걸 훑는" 자리다. 그래서 빈칸을 그리지 않고
 * 기록이 있는 날만 최신순으로 붙인다.
 */
export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { sections, loading, isEmpty, loadMore, refresh } = useJournalArchive();

  // 일기를 고치거나 지우고 돌아오면 반영돼야 한다. 탭은 언마운트되지 않으므로
  // 마운트 시점의 조회만으로는 갱신되지 않는다.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const innerWidth = Math.min(width, layout.maxContentWidth) - spacing.lg * 2;
  const columns = columnsFor(innerWidth);
  const cellSize = cellSizeFor(innerWidth, columns);

  const listSections = useMemo(
    () =>
      sections.map((month) => ({
        yearMonth: month.yearMonth,
        count: month.journals.length,
        data: chunkRows(month.journals, columns),
      })),
    [sections, columns],
  );

  const openDate = useCallback((date: string) => {
    router.push({ pathname: '/journal-view', params: { date } });
  }, []);

  return (
    <ScreenBackground>
      {/* 안전영역은 contentContainer가 아니라 리스트 **바깥**에 준다 —
          sticky 헤더는 콘텐츠 패딩을 무시하고 스크롤 뷰포트 맨 위에 붙어서,
          여기에 주면 달 알약이 상태바와 겹친다. */}
      <ResponsiveContainer style={{ paddingTop: insets.top }}>
        <SectionList<DailyJournal[], { yearMonth: string; count: number }>
          sections={listSections}
          keyExtractor={(row) => row[0].date}
          renderItem={({ item }) => (
            <ArchiveRow journals={item} size={cellSize} onPress={openDate} />
          )}
          renderSectionHeader={({ section }) => (
            <ArchiveMonthHeader
              label={monthLabelKo(section.yearMonth)}
              count={section.count}
            />
          )}
          // 안드로이드는 기본값이 false라 명시해야 한다.
          stickySectionHeadersEnabled
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            // 탭바가 레이아웃 공간을 차지하므로 여기에 탭바 높이를 더하지 않는다.
            { paddingBottom: spacing.xl },
          ]}
          ListHeaderComponent={
            /* 상단 인셋은 ResponsiveContainer가 이미 줬다(sticky 월 헤더 때문에). */
            <FinalHeader subtitle="지금까지 남긴 그림" withTopInset={false} bleed />
          }
          ListEmptyComponent={
            // 첫 조회 중에는 아무것도 띄우지 않는다 — 기록이 있는데도
            // "없어요"가 한 번 깜빡이면 지운 줄 알게 된다.
            loading || !isEmpty ? null : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>아직 남긴 그림이 없어요</Text>
                <Text style={styles.emptyBody}>
                  오늘 하루를 한 장으로 남겨보세요.
                </Text>
                <Pressable
                  onPress={() => router.push('/journal-write')}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>오늘 일기 쓰기</Text>
                </Pressable>
              </View>
            )
          }
        />
      </ResponsiveContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  emptyBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    backgroundColor: colors.action,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.actionText,
  },
});
