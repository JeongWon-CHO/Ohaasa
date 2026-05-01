import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Polygon } from 'react-native-svg';

import { DatePill } from '@/src/components/final/DatePill';
import { FinalHeader } from '@/src/components/final/FinalHeader';
import { RankingRow } from '@/src/components/final/RankingRow';
import { colors, gradients } from '@/src/constants/design';
import { MOCK_BROADCAST_DATE, MOCK_HOROSCOPES } from '@/src/constants/mockHoroscope';
import { useZodiac } from '@/src/hooks/useZodiac';

// ─── Background decoration helpers (same pattern as F3) ──────

type DecoProps = { x: number; y: number; size: number; color: string; opacity: number };

function CircleDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity,
      }}
    />
  );
}

function StarDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Polygon
          points="5,0 6.2,3.8 10,3.8 7,6.2 8.2,10 5,7.8 1.8,10 3,6.2 0,3.8 3.8,3.8"
          fill={color}
        />
      </Svg>
    </View>
  );
}

function MoonDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={color} />
      </Svg>
    </View>
  );
}

// ─── Data ─────────────────────────────────────────────────────

const RANKED_HOROSCOPES = Object.values(MOCK_HOROSCOPES).sort(
  (a, b) => a.rank - b.rank,
);

// ─── Screen ───────────────────────────────────────────────────

export default function RankingsScreen() {
  const { zodiacSign } = useZodiac();

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      {/* FinalAllRankings decorations — HTML FScreenBase spec */}
      <CircleDeco x={-50} y={50}   size={170} color={colors.sky}     opacity={0.11} />
      <CircleDeco x={230} y={-30}  size={160} color={colors.yellow}  opacity={0.10} />
      <CircleDeco x={200} y={590}  size={160} color={colors.apricot} opacity={0.10} />
      <StarDeco   x={46}  y={128}  size={5}   color={colors.yellow}  opacity={0.26} />
      <StarDeco   x={294} y={108}  size={4}   color={colors.apricot} opacity={0.22} />
      <StarDeco   x={28}  y={440}  size={3}   color={colors.yellow}  opacity={0.18} />
      <MoonDeco   x={286} y={174}  size={22}  color={colors.apricot} opacity={0.18} />

      {/* Header — padding '20px 28px 0' per HTML spec */}
      <View style={styles.headerWrap}>
        <FinalHeader subtitle="12개 별자리 오늘의 순위" />
      </View>

      {/* DatePill — margin '12px 28px 0' per HTML spec */}
      <View style={styles.pillWrap}>
        <DatePill dateText={MOCK_BROADCAST_DATE} />
      </View>

      {/* Section title — margin '10px 28px 0' per HTML spec */}
      <View style={styles.titleWrap}>
        <Text style={styles.sectionTitle}>오늘의 전체 순위</Text>
      </View>

      {/* List — padding '12px 18px 16px', gap 7 per HTML spec */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {RANKED_HOROSCOPES.map((horoscope) => (
          <RankingRow
            horoscope={horoscope}
            isMine={horoscope.zodiacSign === zodiacSign}
            key={horoscope.zodiacSign}
          />
        ))}
        <View style={styles.spacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
  headerWrap: {
    paddingTop: 20,
    paddingHorizontal: 28,
    zIndex: 1,
  },
  pillWrap: {
    marginTop: 12,
    marginHorizontal: 28,
    zIndex: 1,
  },
  titleWrap: {
    marginTop: 10,
    marginHorizontal: 28,
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.text,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 96,
    gap: 7,
  },
  spacer: {
    minHeight: 20,
  },
});
