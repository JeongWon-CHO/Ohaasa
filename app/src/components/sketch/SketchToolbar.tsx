import { Feather } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrushSizeSlider } from '@/src/components/sketch/BrushSizeSlider';
import { colors, radius, spacing } from '@/src/constants/design';
import { BRUSHES, SKETCH_COLORS, type BrushKind } from '@/src/lib/sketch';

export { SKETCH_COLORS } from '@/src/lib/sketch';

interface SketchToolbarProps {
  color: string;
  /** 직접 고른 색. 없으면 [+] 스와치가 빈 자리로 보인다. */
  customColor: string | null;
  strokeWidth: number;
  brush: BrushKind;
  canUndo: boolean;
  /** 굵기 미리보기를 실제 획 크기로 그리기 위한 캔버스 폭 */
  canvasSize: number;
  onSelectColor: (color: string) => void;
  onSelectWidth: (width: number) => void;
  onSelectBrush: (brush: BrushKind) => void;
  onOpenColorPicker: () => void;
  /** 스포이드가 켜져 있는지 */
  picking: boolean;
  onTogglePick: () => void;
  onUndo: () => void;
  onClear: () => void;
}

export function SketchToolbar({
  color,
  customColor,
  strokeWidth,
  brush,
  canUndo,
  canvasSize,
  onSelectColor,
  onSelectWidth,
  onSelectBrush,
  onOpenColorPicker,
  picking,
  onTogglePick,
  onUndo,
  onClear,
}: SketchToolbarProps) {
  return (
    <View style={styles.container}>
      {/*
        13칸(프리셋 12 + 직접 고르기)을 한 줄에 넣으면 스와치가 손가락보다 작아진다.
        flexWrap에 맡기면 폭에 따라 12개가 한 줄에 들어가 1개만 다음 줄로 떨어지므로
        7 · 6으로 잘라 두 줄로 명시한다. 그리기 단계는 스크롤이 없어 줄을 더 늘리면
        캔버스가 그만큼 줄어들기 때문에 두 줄을 넘기지 않는다.
      */}
      {PALETTE_ROWS.map((row, i) => (
        <View key={i} style={styles.palette}>
          {row.map((c) =>
            c === CUSTOM_SLOT ? (
              <Pressable
                key={c}
                onPress={onOpenColorPicker}
                hitSlop={8}
                style={[
                  styles.swatch,
                  styles.customSwatch,
                  customColor ? { backgroundColor: customColor } : null,
                  customColor !== null && color === customColor && styles.swatchActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="색 직접 고르기"
              >
                {/* 고른 색 위에서도 보이도록 테두리색을 따라간다 */}
                <Feather
                  name="plus"
                  size={15}
                  color={customColor ? '#FFFDF9' : colors.textMid}
                />
              </Pressable>
            ) : (
              <Pressable
                key={c}
                onPress={() => onSelectColor(c)}
                hitSlop={8}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
              />
            ),
          )}
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

        {/* 스포이드는 켜고 끄는 모드라 되돌리기·비우기와 달리 눌린 상태가 남는다. */}
        <Pressable
          onPress={onTogglePick}
          style={[styles.icon, picking && styles.iconActive]}
          accessibilityRole="button"
          accessibilityLabel="그림에서 색 집기"
          accessibilityState={{ selected: picking }}
        >
          <FontAwesome5
            name="eye-dropper"
            size={13}
            color={picking ? colors.actionText : colors.textMid}
          />
        </Pressable>
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

/** 팔레트 마지막 칸. 색이 아니라 "직접 고르기" 버튼이다. */
const CUSTOM_SLOT = 'custom';

const PER_ROW = 7;
const PALETTE_SLOTS: string[] = [...SKETCH_COLORS, CUSTOM_SLOT];
const PALETTE_ROWS = Array.from({ length: Math.ceil(PALETTE_SLOTS.length / PER_ROW) }, (_, i) =>
  PALETTE_SLOTS.slice(i * PER_ROW, i * PER_ROW + PER_ROW),
);

const SWATCH = 30;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },

  // space-between으로 폭을 꽉 채우면 색끼리 너무 벌어진다. 한 덩어리로 모아 가운데 둔다.
  // 한 줄이 7칸이 되면서 간격을 24에서 좁혔다 — 7 × 30 + 6 × 16 = 306이라
  // 375pt 화면(본문 폭 335)에 들어간다.
  palette: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  customSwatch: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.textSoft,
    borderStyle: 'dashed',
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
  iconActive: {
    backgroundColor: colors.action,
    borderColor: colors.action,
  },
  disabled: { opacity: 0.4 },
});
