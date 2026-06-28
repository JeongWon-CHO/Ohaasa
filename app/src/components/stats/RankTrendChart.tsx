import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { colors } from '@/src/constants/design';
import { formatDateLabel, type RankPoint } from '@/src/hooks/useHoroscopeTrends';

interface RankTrendChartProps {
  points: RankPoint[];
  width: number;
  height?: number;
}

const PADDING_Y = 14;
const PADDING_LEFT = 26;
const PADDING_RIGHT = 10;
const MIN_RANK = 1;
const MAX_RANK = 12;
const MAX_DATE_LABELS = 6;

function yScale(rank: number, height: number): number {
  return PADDING_Y + ((rank - MIN_RANK) / (MAX_RANK - MIN_RANK)) * (height - 2 * PADDING_Y);
}

function xScale(index: number, count: number, width: number): number {
  const span = count > 1 ? count - 1 : 1;
  return PADDING_LEFT + (index / span) * (width - PADDING_LEFT - PADDING_RIGHT);
}

export function RankTrendChart({ points, width, height = 160 }: RankTrendChartProps) {
  if (points.length === 0) return null;

  const coords = points.map((p, i) => ({
    x: xScale(i, points.length, width),
    y: yScale(p.rank, height),
  }));

  const labelStep = Math.max(1, Math.ceil(points.length / MAX_DATE_LABELS));

  return (
    <View>
      <Svg width={width} height={height}>
        <Line
          x1={PADDING_LEFT}
          y1={yScale(MIN_RANK, height)}
          x2={width - PADDING_RIGHT}
          y2={yScale(MIN_RANK, height)}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Line
          x1={PADDING_LEFT}
          y1={yScale(MAX_RANK, height)}
          x2={width - PADDING_RIGHT}
          y2={yScale(MAX_RANK, height)}
          stroke={colors.border}
          strokeWidth={1}
        />
        <SvgText
          x={PADDING_LEFT - 6}
          y={yScale(MIN_RANK, height) + 3}
          fontSize={9}
          fill={colors.textSoft}
          textAnchor="end"
        >
          1위
        </SvgText>
        <SvgText
          x={PADDING_LEFT - 6}
          y={yScale(MAX_RANK, height) + 3}
          fontSize={9}
          fill={colors.textSoft}
          textAnchor="end"
        >
          12위
        </SvgText>
        {coords.length > 1 && (
          <Polyline
            points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
            fill="none"
            stroke={colors.apricotDark}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {coords.map((c, i) => (
          <Circle key={points[i].date} cx={c.x} cy={c.y} r={4} fill={colors.apricotDark} />
        ))}
      </Svg>
      <View style={[styles.labelRow, { paddingLeft: PADDING_LEFT, paddingRight: PADDING_RIGHT }]}>
        {points.map((p, i) => {
          const showLabel = i % labelStep === 0 || i === points.length - 1;
          return (
            <Text key={p.date} style={styles.label}>
              {showLabel ? formatDateLabel(p.date) : ''}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  label: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    textAlign: 'center',
  },
});
