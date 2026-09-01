import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import { colors, radius } from '@/src/constants/design';
import { renderStroke } from '@/src/components/sketch/StrokePath';
import { CANVAS_ASPECT, type Sketch } from '@/src/lib/sketch';

/**
 * 작게 그릴 때 선이 실처럼 얇아져 사라지는 걸 막는 하한.
 * 좌표를 정규화해둔 덕에 썸네일은 size만 바꿔 끼우면 된다.
 */
const MIN_STROKE_PX = 0.9;

/** 이보다 작으면 재질 겹을 접는다 — 점선이 뭉쳐 얼룩처럼 보인다. */
const SIMPLIFY_BELOW = 90;

interface SketchThumbnailProps {
  sketch: Sketch;
  size: number;
  /** 캘린더 칸처럼 이미 격자선이 있는 자리에서는 자체 카드 테두리를 끈다. */
  bare?: boolean;
}

export const SketchThumbnail = memo(function SketchThumbnail({
  sketch,
  size,
  bare,
}: SketchThumbnailProps) {
  return (
    <View
      style={[
        !bare && styles.frame,
        { width: size, height: size * CANVAS_ASPECT },
      ]}
    >
      <Svg width={size} height={size * CANVAS_ASPECT}>
        {sketch.strokes.map((stroke, i) =>
          renderStroke(stroke, size, i, size < SIMPLIFY_BELOW, MIN_STROKE_PX),
        )}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.cardSolid,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
