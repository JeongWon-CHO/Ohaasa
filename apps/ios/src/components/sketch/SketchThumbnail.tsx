import { Canvas } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GraphPaper } from '@/src/components/sketch/GraphPaper';
import { SkiaStrokes } from '@/src/components/sketch/SkiaStroke';
import { colors, radius } from '@/src/constants/design';
import { CANVAS_ASPECT, strokeToPath, type Sketch } from '@/src/lib/sketch';

/**
 * 작게 그릴 때 선이 실처럼 얇아져 사라지는 걸 막는 하한.
 * 좌표를 정규화해둔 덕에 썸네일은 size만 바꿔 끼우면 된다.
 */
const MIN_STROKE_PX = 0.9;

/**
 * 이보다 작으면 재질을 접고 react-native-svg로 그린다. 두 가지 이유다.
 *   ① 이 크기에서는 알갱이가 뭉쳐 얼룩으로만 보인다.
 *   ② 달력은 한 화면에 칸이 42개인데 Skia <Canvas>는 각각이 네이티브 뷰라
 *      그만큼 띄우면 무겁다. 질감이 안 보이는 자리에 비용을 낼 이유가 없다.
 */
const TEXTURE_ABOVE = 90;

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
  const height = size * CANVAS_ASPECT;

  return (
    <View style={[!bare && styles.frame, { width: size, height }]}>
      {/* 모눈도 질감과 같은 기준으로 접는다 — 작은 칸에서는 선이 그림을 덮는다. */}
      {size >= TEXTURE_ABOVE && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <GraphPaper size={size} aspect={CANVAS_ASPECT} />
        </View>
      )}
      {size >= TEXTURE_ABOVE ? (
        <Canvas style={{ width: size, height }}>
          <SkiaStrokes strokes={sketch.strokes} size={size} minWidth={MIN_STROKE_PX} />
        </Canvas>
      ) : (
        <Svg width={size} height={height}>
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
      )}
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
