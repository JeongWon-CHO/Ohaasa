import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrushSizeSlider } from '@/src/components/sketch/BrushSizeSlider';
import { colors, radius, spacing } from '@/src/constants/design';
import { BRUSHES, SKETCH_COLORS, type BrushKind } from '@/src/lib/sketch';

export { SKETCH_COLORS } from '@/src/lib/sketch';

interface SketchToolbarProps {
  color: string;
  strokeWidth: number;
  brush: BrushKind;
  canUndo: boolean;
  /** 굵기 미리보기를 실제 획 크기로 그리기 위한 캔버스 폭 */
  canvasSize: number;
  onSelectColor: (color: string) => void;
  onSelectWidth: (width: number) => void;
  onSelectBrush: (brush: BrushKind) => void;
  onUndo: () => void;
  onClear: () => void;
}

export function SketchToolbar({
  color,
  strokeWidth,
  brush,
  canUndo,
  canvasSize,
  onSelectColor,
  onSelectWidth,
  onSelectBrush,
  onUndo,
  onClear,
}: SketchToolbarProps) {
  return (
    <View style={styles.container}>
      {/*
        12색을 한 줄에 넣으면 스와치가 손가락보다 작아진다.
        flexWrap에 맡기면 폭에 따라 11개가 한 줄에 들어가 1개만 다음 줄로 떨어지므로
        6개씩 잘라 두 줄로 명시한다.
      */}
      {PALETTE_ROWS.map((row, i) => (
        <View key={i} style={styles.palette}>
          {row.map((c) => (
            <Pressable
              key={c}
              onPress={() => onSelectColor(c)}
              hitSlop={8}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
            />
          ))}
        </View>
      ))}

      <BrushSizeSlider
        value={strokeWidth}
        onChange={onSelectWidth}
        previewBase={canvasSize}
        color={color}
      />

      <View style={styles.row}>
        {BRUSHES.map((b) => (
          <Pressable
            key={b.kind}
            onPress={() => onSelectBrush(b.kind)}
            style={[styles.brush, brush === b.kind && styles.brushActive]}
          >
            <Text style={[styles.brushText, brush === b.kind && styles.brushTextActive]}>
              {b.label}
            </Text>
          </Pressable>
        ))}

        <View style={styles.spacer} />

        <Pressable onPress={onUndo} disabled={!canUndo} style={[styles.icon, !canUndo && styles.disabled]}>
          <Feather name="rotate-ccw" size={15} color={colors.textMid} />
        </Pressable>
        <Pressable onPress={onClear} style={styles.icon}>
          <Feather name="trash-2" size={15} color={colors.textMid} />
        </Pressable>
      </View>
    </View>
  );
}

const PER_ROW = 6;
const PALETTE_ROWS = Array.from({ length: Math.ceil(SKETCH_COLORS.length / PER_ROW) }, (_, i) =>
  SKETCH_COLORS.slice(i * PER_ROW, i * PER_ROW + PER_ROW),
);

const SWATCH = 30;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },

  // space-between으로 폭을 꽉 채우면 색끼리 너무 벌어진다. 한 덩어리로 모아 가운데 둔다.
  // 24는 spacing 토큰에 없는 값이라 그대로 적는다(xl 20은 좁고 xxl 28은 넓었다).
  palette: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: colors.text,
    transform: [{ scale: 1.12 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  spacer: { flex: 1 },
  brush: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brushActive: {
    backgroundColor: colors.cream3,
    borderColor: colors.textSoft,
  },
  brushText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  brushTextActive: {
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: { opacity: 0.4 },
});
