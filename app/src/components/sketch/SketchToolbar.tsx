import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/constants/design';
import { BRUSHES, SKETCH_COLORS, SKETCH_WIDTHS, type BrushKind } from '@/src/lib/sketch';

export { SKETCH_COLORS, SKETCH_WIDTHS } from '@/src/lib/sketch';

interface SketchToolbarProps {
  color: string;
  strokeWidth: number;
  brush: BrushKind;
  canUndo: boolean;
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
  onSelectColor,
  onSelectWidth,
  onSelectBrush,
  onUndo,
  onClear,
}: SketchToolbarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {SKETCH_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => onSelectColor(c)}
            hitSlop={8}
            style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
          />
        ))}

        <View style={styles.divider} />

        {SKETCH_WIDTHS.map((w) => (
          <Pressable
            key={w}
            onPress={() => onSelectWidth(w)}
            hitSlop={8}
            style={[styles.widthBtn, strokeWidth === w && styles.widthBtnActive]}
          >
            <View
              style={{
                width: w * 340,
                height: w * 340,
                borderRadius: (w * 340) / 2,
                backgroundColor: colors.text,
              }}
            />
          </Pressable>
        ))}
      </View>

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
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={onUndo}
          disabled={!canUndo}
          style={[styles.action, !canUndo && styles.actionDisabled]}
        >
          <Feather name="rotate-ccw" size={14} color={colors.textMid} />
          <Text style={styles.actionText}>되돌리기</Text>
        </Pressable>

        <Pressable onPress={onClear} style={styles.action}>
          <Feather name="trash-2" size={14} color={colors.textMid} />
          <Text style={styles.actionText}>전체 지우기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: colors.textSoft,
    transform: [{ scale: 1.15 }],
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.border,
  },
  widthBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  widthBtnActive: {
    backgroundColor: colors.cream3,
  },
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
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
  },
});
