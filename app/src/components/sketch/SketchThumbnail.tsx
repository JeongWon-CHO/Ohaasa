import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/src/constants/design';
import { CANVAS_ASPECT, type Sketch, strokeToPath } from '@/src/lib/sketch';

/**
 * 작게 그릴 때 선이 실처럼 얇아져 사라지는 걸 막는 하한.
 * 좌표를 정규화해둔 덕에 썸네일은 size만 바꿔 끼우면 된다.
 */
const MIN_STROKE_PX = 0.9;

interface SketchThumbnailProps {
  sketch: Sketch;
  size: number;
}

export const SketchThumbnail = memo(function SketchThumbnail({
  sketch,
  size,
}: SketchThumbnailProps) {
  return (
    <View style={[styles.frame, { width: size, height: size * CANVAS_ASPECT }]}>
      <Svg width={size} height={size * CANVAS_ASPECT}>
        {sketch.strokes.map((stroke, i) => (
          <Path
            key={i}
            d={strokeToPath(stroke, size)}
            stroke={stroke.color}
            strokeWidth={Math.max(stroke.width * size, MIN_STROKE_PX)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
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
