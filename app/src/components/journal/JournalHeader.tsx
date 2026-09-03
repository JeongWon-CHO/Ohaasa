import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { APP_TITLE } from '@/src/constants/app';
import { colors, layout, spacing } from '@/src/constants/design';

/** 홈 상단 헤더. 앱 이름은 FinalHeader와 같은 상수를 본다(constants/app.ts). */

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function formatTodayKo(date = new Date()): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_KO[date.getDay()]}요일`;
}

interface JournalHeaderProps {
  subtitle?: string;
  /** 공유·설정 같은 걸 나중에 붙일 자리 */
  rightSlot?: ReactNode;
}

export function JournalHeader({ subtitle, rightSlot }: JournalHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>{APP_TITLE}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.actions}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    // 부모(홈 스크롤 컨테이너)가 이미 본문용 여백을 주고 있어 그만큼 되물린 뒤
    // 헤더 값을 직접 준다 — My 탭(FinalHeader)과 제목 시작점을 맞추기 위함이다.
    marginHorizontal: -spacing.lg,
    paddingHorizontal: layout.headerPaddingH,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 32,
  },
});
