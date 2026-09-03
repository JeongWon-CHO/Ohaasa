import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/src/constants/design';

/**
 * 홈 상단 헤더.
 *
 * `app.config.js`의 `name`과 항상 같은 값이어야 한다 — 홈 화면 아이콘 라벨과
 * 앱 안 헤더가 다른 이름을 말하면 같은 앱으로 안 읽힌다.
 * slug·bundleId('ohaasa')는 별개다(EAS 프로젝트 식별자 · 스토어 등록 후 변경 불가).
 */
const APP_TITLE = '하루끄적';

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
