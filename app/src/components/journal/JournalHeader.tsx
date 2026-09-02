import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/src/constants/design';

/**
 * 홈 상단 헤더.
 *
 * 앱 이름이 아직 안 정해졌지만 자리를 먼저 잡아둔다 — 나중에 끼워 넣으면
 * 그 아래 레이아웃을 전부 다시 잡아야 한다.
 * 이름이 정해지면 APP_TITLE과 app.config.js의 `name`을 같이 바꾼다.
 */
const APP_TITLE = 'ohaasa';

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
