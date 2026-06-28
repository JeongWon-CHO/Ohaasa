import { format, parseISO } from 'date-fns';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from 'react-native-svg';

import { colors } from '@/src/constants/design';
import { OVERALL_AVERAGE_RANK, type RankPoint } from '@/src/hooks/useHoroscopeTrends';

interface RankTrendChartProps {
  points: RankPoint[];
  comparePoints?: RankPoint[];
  width: number;
  height?: number;
}

const PADDING_RIGHT = 8;
const PADDING_LEFT = 32;
const LABEL_X = 2;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 20;
const MIN_RANK = 1;
const MAX_RANK = 12;
const MARKER_TARGET = 6;
const DATE_LABEL_TARGET = 6;
const DATE_LABEL_WIDTH = 40;

function yScale(rank: number, height: number): number {
  return PADDING_TOP + ((rank - MIN_RANK) / (MAX_RANK - MIN_RANK)) * (height - PADDING_TOP - PADDING_BOTTOM);
}

function xScale(index: number, count: number, width: number): number {
  const span = count > 1 ? count - 1 : 1;
  return PADDING_LEFT + (index / span) * (width - PADDING_LEFT - PADDING_RIGHT);
}

function formatDateLabel(dateStr: string): string {
  return format(parseISO(dateStr), 'M/d');
}

function buildSmoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length < 2) return '';
  if (coords.length === 2) {
    return `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;
  }

  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function sampleMarkerIndices(count: number, target: number): number[] {
  if (count <= target + 1) return Array.from({ length: count }, (_, i) => i);

  const step = (count - 1) / (target - 1);
  const indices = new Set<number>();
  for (let i = 0; i < target; i++) {
    indices.add(Math.round(i * step));
  }
  indices.add(count - 1);
  return Array.from(indices).sort((a, b) => a - b);
}

export function RankTrendChart({ points, comparePoints = [], width, height = 160 }: RankTrendChartProps) {
  if (points.length === 0) return null;

  const coords = points.map((p, i) => ({
    x: xScale(i, points.length, width),
    y: yScale(p.rank, height),
  }));

  const compareCoords = comparePoints.reduce<{ x: number; y: number }[]>((acc, p) => {
    const i = points.findIndex((mp) => mp.date === p.date);
    if (i !== -1) acc.push({ x: xScale(i, points.length, width), y: yScale(p.rank, height) });
    return acc;
  }, []);

  const lastIndex = coords.length - 1;
  const lastPointLabel = points[lastIndex].date === format(new Date(), 'yyyy-MM-dd') ? '오늘' : '최근';
  const baselineY = yScale(OVERALL_AVERAGE_RANK, height);
  const markerIndices = sampleMarkerIndices(coords.length, MARKER_TARGET);
  const dateLabelIndices = sampleMarkerIndices(coords.length, DATE_LABEL_TARGET);

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.apricot} stopOpacity={0.42} />
            <Stop offset="0.55" stopColor={colors.yellow} stopOpacity={0.18} />
            <Stop offset="1" stopColor={colors.yellow} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Line
          x1={PADDING_LEFT}
          y1={baselineY}
          x2={width - PADDING_RIGHT}
          y2={baselineY}
          stroke={colors.chartBaseline}
          strokeWidth={1}
          strokeDasharray="2,5"
        />

        {compareCoords.length >= 2 && (
          <>
            <Path
              d={buildSmoothPath(compareCoords)}
              fill="none"
              stroke={colors.skyDark}
              strokeWidth={2}
              strokeDasharray="4,4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {compareCoords.map((c, i) => (
              <Circle key={`compare-${i}`} cx={c.x} cy={c.y} r={2.6} fill="#FFFFFF" stroke={colors.skyDark} strokeWidth={1.6} />
            ))}
          </>
        )}

        {coords.length >= 2 && (
          <>
            <Path
              d={`${buildSmoothPath(coords)} L ${coords[lastIndex].x} ${height - PADDING_BOTTOM} L ${coords[0].x} ${height - PADDING_BOTTOM} Z`}
              fill="url(#areaFill)"
            />
            <Path
              d={buildSmoothPath(coords)}
              fill="none"
              stroke={colors.apricotDark}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        <SvgText x={LABEL_X} y={10} fontSize={9} fill={colors.textSoft} textAnchor="start">
          1위
        </SvgText>
        <SvgText x={LABEL_X} y={yScale(6, height) + 3} fontSize={9} fill={colors.textSoft} textAnchor="start">
          6위
        </SvgText>
        <SvgText x={LABEL_X} y={height - 4} fontSize={9} fill={colors.textSoft} textAnchor="start">
          12위
        </SvgText>

        {markerIndices.map((i) => {
          const c = coords[i];
          const isToday = i === lastIndex;
          if (isToday) {
            return (
              <Circle key={points[i].date} cx={c.x} cy={c.y} r={7} fill={colors.apricotDark} opacity={0.16} />
            );
          }
          return <Circle key={points[i].date} cx={c.x} cy={c.y} r={3} fill="#FFFFFF" stroke={colors.apricotDark} strokeWidth={1.8} />;
        })}
        <Circle cx={coords[lastIndex].x} cy={coords[lastIndex].y} r={4} fill={colors.apricotDark} />
        <SvgText x={coords[lastIndex].x} y={coords[lastIndex].y - 14} fontSize={10} fill={colors.apricotDark} textAnchor="middle">
          {lastPointLabel}
        </SvgText>

        <SvgText x={LABEL_X + 34} y={baselineY + 14} fontSize={9} fill={colors.textSoft} textAnchor="start">
          전체 평균 {OVERALL_AVERAGE_RANK}위
        </SvgText>
      </Svg>
      <View style={[styles.dateLabelRow, { width }]}>
        {dateLabelIndices.map((i) => {
          const left = coords[i].x - DATE_LABEL_WIDTH / 2;

          return (
            <Text key={points[i].date} style={[styles.dateLabel, { left }]}>
              {formatDateLabel(points[i].date)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateLabelRow: {
    height: 14,
    marginTop: 4,
  },
  dateLabel: {
    position: 'absolute',
    width: DATE_LABEL_WIDTH,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'NotoSansKR_400Regular',
    includeFontPadding: false,
    color: colors.textSoft,
    textAlign: 'center',
  },
});
