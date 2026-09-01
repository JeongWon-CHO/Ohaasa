import { Canvas } from '@shopify/react-native-skia';
import { memo, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { GraphPaper } from '@/src/components/sketch/GraphPaper';
import { SkiaStroke, SkiaStrokes } from '@/src/components/sketch/SkiaStroke';
import { colors, radius } from '@/src/constants/design';
import { CANVAS_ASPECT, type BrushKind, type Point, type Stroke } from '@/src/lib/sketch';

/**
 * 터치 이벤트는 1px만 움직여도 들어온다. 전부 담으면 점이 수천 개가 되어
 * 용량과 path 계산 비용만 늘고 선 모양은 달라지지 않는다.
 */
const MIN_DISTANCE_PX = 1.5;

interface DrawingCanvasProps {
  /** 캔버스 폭(px). 높이는 size * CANVAS_ASPECT. */
  size: number;
  strokes: Stroke[];
  color: string;
  /** 정규화 단위(캔버스 폭 대비 비율) */
  strokeWidth: number;
  brush: BrushKind;
  onStrokeEnd: (stroke: Stroke) => void;
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/**
 * 이미 그은 획은 그리는 동안 바뀌지 않는다. 분리해두지 않으면 손가락이 움직일 때마다
 * 전체 획의 path 문자열을 다시 만들게 되어 획이 쌓일수록 눈에 띄게 느려진다.
 */
const CommittedStrokes = memo(function CommittedStrokes({
  strokes,
  size,
}: {
  strokes: Stroke[];
  size: number;
}) {
  return <SkiaStrokes strokes={strokes} size={size} />;
});

export function DrawingCanvas({
  size,
  strokes,
  color,
  strokeWidth,
  brush,
  onStrokeEnd,
}: DrawingCanvasProps) {
  const pointsRef = useRef<Point[]>([]);
  const originRef = useRef({ x: 0, y: 0 });
  const lastPxRef = useRef({ x: 0, y: 0 });
  const [livePoints, setLivePoints] = useState<Point[]>([]);

  // PanResponder가 제스처 도중에 새로 만들어지면 그 획이 끊긴다.
  // 아래 값은 모두 손가락이 닿아 있는 동안에는 바뀔 수 없어서(색·굵기·재질은 툴바 탭,
  // size는 회전, onStrokeEnd는 화면에서 useCallback으로 고정) 의존성으로 두어도 안전하다.
  // 여기에 매 렌더 바뀌는 값을 추가하면 그리기가 조용히 깨진다.
  const panResponder = useMemo(
    () =>
      // 아래 ref들(그리는 중의 점 버퍼·캔버스 원점)은 PanResponder 콜백에서만 읽는다.
      // 그 콜백은 네이티브 터치 이벤트로만 호출되고 렌더 중에는 실행되지 않는데,
      // 린터가 PanResponder.create 안쪽까지는 보지 못해 오탐이 난다.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // 캔버스가 스크롤뷰 안에 있어도 그리기가 스크롤에 뺏기지 않게 한다.
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: (evt) => {
          const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
          // locationX/Y는 이 View 기준 좌표라 pageX - locationX가 곧 캔버스의 화면 원점이다.
          // measureInWindow는 비동기라 첫 move가 먼저 도착할 수 있어서 쓰지 않는다.
          originRef.current = { x: pageX - locationX, y: pageY - locationY };
          lastPxRef.current = { x: pageX, y: pageY };

          const s = size;
          const point: Point = [
            clamp(locationX / s, 1),
            clamp(locationY / s, CANVAS_ASPECT),
          ];
          pointsRef.current = [point];
          setLivePoints(pointsRef.current);
        },

        onPanResponderMove: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          const dx = pageX - lastPxRef.current.x;
          const dy = pageY - lastPxRef.current.y;
          if (dx * dx + dy * dy < MIN_DISTANCE_PX * MIN_DISTANCE_PX) return;
          lastPxRef.current = { x: pageX, y: pageY };

          const s = size;
          const point: Point = [
            clamp((pageX - originRef.current.x) / s, 1),
            clamp((pageY - originRef.current.y) / s, CANVAS_ASPECT),
          ];
          pointsRef.current = [...pointsRef.current, point];
          setLivePoints(pointsRef.current);
        },

        onPanResponderRelease: () => {
          if (pointsRef.current.length > 0) {
            onStrokeEnd({
              points: pointsRef.current,
              color,
              width: strokeWidth,
              brush,
            });
          }
          pointsRef.current = [];
          setLivePoints([]);
        },
        onPanResponderTerminate: () => {
          pointsRef.current = [];
          setLivePoints([]);
        },
      }),
    [size, color, strokeWidth, brush, onStrokeEnd],
  );

  const height = size * CANVAS_ASPECT;
  const liveStroke: Stroke = { points: livePoints, color, width: strokeWidth, brush };

  return (
    <View
      style={[styles.canvas, { width: size, height }]}
      {...panResponder.panHandlers}
    >
      {/* 모눈은 그림 아래에 깔린다 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <GraphPaper size={size} aspect={CANVAS_ASPECT} />
      </View>

      {/* 터치는 부모 View가 받아야 grant의 locationX/Y가 캔버스 기준이 된다. */}
      <Canvas style={{ width: size, height }} pointerEvents="none">
        <CommittedStrokes strokes={strokes} size={size} />
        {livePoints.length > 0 && <SkiaStroke stroke={liveStroke} size={size} />}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: colors.cardSolid,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
