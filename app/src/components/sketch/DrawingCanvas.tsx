import { Canvas, Group, Line, vec } from '@shopify/react-native-skia';
import { memo, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { GRAPH_CELLS, GraphPaper } from '@/src/components/sketch/GraphPaper';
import { SkiaStroke, SkiaStrokes } from '@/src/components/sketch/SkiaStroke';
import { colors, radius } from '@/src/constants/design';
import {
  CANVAS_ASPECT,
  pickStrokeColorAt,
  type BrushKind,
  type Point,
  type Stroke,
} from '@/src/lib/sketch';

/**
 * 터치 이벤트는 1px만 움직여도 들어온다. 전부 담으면 점이 수천 개가 되어
 * 용량과 path 계산 비용만 늘고 선 모양은 달라지지 않는다.
 */
const MIN_DISTANCE_PX = 1.5;

/** 스포이드 돋보기. 손가락 위로 띄워 지금 짚고 있는 자리를 확대해 보여준다. */
const LOUPE_SIZE = 96;
const LOUPE_ZOOM = 2.6;
/** 손가락과 돋보기 사이. 이보다 가까우면 돋보기 아래쪽이 손가락에 가린다. */
const LOUPE_LIFT = 64;
const CROSSHAIR = 16;
/**
 * 스포이드가 다시 판정할 최소 이동 거리. 그리기(MIN_DISTANCE_PX)보다 크게 잡는다 —
 * 획은 점이 촘촘해야 선이 매끄럽지만, 스포이드는 2px 움직임으로 집히는 색이 바뀌지 않는다.
 */
const PICK_MIN_DISTANCE_PX = 3;

interface PickState {
  /** 정규화 좌표 */
  x: number;
  y: number;
  /** 그 자리 획의 색. 빈 종이면 null. */
  color: string | null;
}

interface DrawingCanvasProps {
  /** 캔버스 폭(px). 높이는 size * CANVAS_ASPECT. */
  size: number;
  strokes: Stroke[];
  color: string;
  /** 정규화 단위(캔버스 폭 대비 비율) */
  strokeWidth: number;
  brush: BrushKind;
  onStrokeEnd: (stroke: Stroke) => void;
  /** 스포이드 모드. 켜져 있으면 캔버스를 눌러도 획이 그어지지 않는다. */
  picking?: boolean;
  /** 짚은 자리의 색. 빈 종이를 짚으면 null. */
  onPickColor?: (color: string | null) => void;
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/**
 * 이미 그은 획은 그리는 동안 바뀌지 않는다. 분리해두지 않으면 손가락이 움직일 때마다
 * 전체 획의 path 문자열을 다시 만들게 되어 획이 쌓일수록 눈에 띄게 느려진다.
 */
/**
 * 그림이 실제로 올라가는 면.
 *
 * 스포이드로 손가락을 끌면 DrawingCanvas가 매 프레임 다시 렌더되는데, 그때
 * 이 면까지 함께 다시 그릴 이유는 없다. liveStroke 객체를 만들어 넘기면 매번
 * 새 참조라 memo가 항상 빗나가므로, 재료를 그대로 받아 안에서 만든다.
 */
const DrawingSurface = memo(function DrawingSurface({
  strokes,
  size,
  height,
  livePoints,
  color,
  strokeWidth,
  brush,
}: {
  strokes: Stroke[];
  size: number;
  height: number;
  livePoints: Point[];
  color: string;
  strokeWidth: number;
  brush: BrushKind;
}) {
  return (
    <Canvas style={{ width: size, height }} pointerEvents="none">
      <CommittedStrokes strokes={strokes} size={size} />
      {livePoints.length > 0 && (
        <SkiaStroke
          stroke={{ points: livePoints, color, width: strokeWidth, brush }}
          size={size}
        />
      )}
    </Canvas>
  );
});

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
  picking = false,
  onPickColor,
}: DrawingCanvasProps) {
  const pointsRef = useRef<Point[]>([]);
  const originRef = useRef({ x: 0, y: 0 });
  const lastPxRef = useRef({ x: 0, y: 0 });
  const [livePoints, setLivePoints] = useState<Point[]>([]);
  // 손을 뗄 때 확정할 색은 마지막 위치의 것이다. state는 다음 렌더에나 반영되므로
  // release 콜백에서 바로 읽을 수 있는 ref를 따로 둔다.
  const pickRef = useRef<PickState | null>(null);
  const [pick, setPick] = useState<PickState | null>(null);

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
      (() => {
        function updatePick(offsetX: number, offsetY: number) {
          const x = clamp(offsetX / size, 1);
          const y = clamp(offsetY / size, CANVAS_ASPECT);
          const next: PickState = { x, y, color: pickStrokeColorAt(strokes, x, y) };
          pickRef.current = next;
          setPick(next);
        }

        return PanResponder.create({
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

          if (picking) {
            // 짚는 동안에는 확정하지 않는다 — 손가락이 가린 자리를 돋보기로 보여주고,
            // 뗄 때의 위치로 정한다.
            updatePick(locationX, locationY);
            return;
          }

          const s = size;
          const point: Point = [
            clamp(locationX / s, 1),
            clamp(locationY / s, CANVAS_ASPECT),
          ];
          pointsRef.current = [point];
          setLivePoints(pointsRef.current);
        },

        onPanResponderMove: (evt) => {
          if (picking) {
            const { pageX, pageY } = evt.nativeEvent;
            const pdx = pageX - lastPxRef.current.x;
            const pdy = pageY - lastPxRef.current.y;
            if (pdx * pdx + pdy * pdy < PICK_MIN_DISTANCE_PX * PICK_MIN_DISTANCE_PX) return;
            lastPxRef.current = { x: pageX, y: pageY };
            updatePick(pageX - originRef.current.x, pageY - originRef.current.y);
            return;
          }
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
          if (picking) {
            onPickColor?.(pickRef.current?.color ?? null);
            pickRef.current = null;
            setPick(null);
            return;
          }
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
          pickRef.current = null;
          setPick(null);
          pointsRef.current = [];
          setLivePoints([]);
        },
        });
      })(),
    // strokes는 획을 놓는 순간에만 바뀐다 — 제스처 도중에는 그대로라 여기 둬도 안전하다.
    [size, color, strokeWidth, brush, onStrokeEnd, picking, onPickColor, strokes],
  );

  const height = size * CANVAS_ASPECT;

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
      <DrawingSurface
        strokes={strokes}
        size={size}
        height={height}
        livePoints={livePoints}
        color={color}
        strokeWidth={strokeWidth}
        brush={brush}
      />

      {pick && (
        <PickLoupe pick={pick} strokes={strokes} size={size} canvasHeight={height} />
      )}
    </View>
  );
}

/**
 * 스포이드 돋보기.
 *
 * 같은 그림을 확대해 보여준다 — 캔버스를 이미지로 떠서 확대하면 획이 뭉개지지만,
 * 벡터를 다시 그리면 확대해도 선이 그대로다.
 *
 * **면은 돋보기 크기(96)만 만들고 그 안에서 Skia가 확대한다.** 그림 전체를
 * 2.6배 면에 그린 뒤 96px 구멍으로 들여다보게 하면, 실제로는 910×910짜리 면을
 * 매 프레임 합성하면서 그중 1%만 보게 되는 셈이라 손가락을 끌 때 그대로 밀린다.
 *
 * 캔버스가 `overflow: hidden`이라 돋보기는 캔버스 밖으로 나갈 수 없다. 그래서
 * 손가락 위에 띄우되 가장자리에서는 안쪽으로 물린다 — 위쪽 끝에서 잘려 보이는 것보다
 * 자리를 옮기는 편이 낫다.
 */
function PickLoupe({
  pick,
  strokes,
  size,
  canvasHeight,
}: {
  pick: PickState;
  strokes: Stroke[];
  size: number;
  canvasHeight: number;
}) {
  const radius = LOUPE_SIZE / 2;
  const fingerX = pick.x * size;
  const fingerY = pick.y * size;

  const left = Math.min(Math.max(fingerX - radius, 0), Math.max(size - LOUPE_SIZE, 0));
  const top = Math.min(
    Math.max(fingerY - LOUPE_LIFT - LOUPE_SIZE, 0),
    Math.max(canvasHeight - LOUPE_SIZE, 0),
  );

  // 손가락을 끄는 동안 바뀌는 건 아래 Group의 transform 하나뿐이다. 그림 자체는
  // 같은 element 참조를 유지해 Skia가 획마다 path를 다시 만들지 않게 한다.
  const content = useMemo(
    () => (
      <>
        <LoupeGrid size={size} />
        <SkiaStrokes strokes={strokes} size={size} />
      </>
    ),
    [strokes, size],
  );

  return (
    <View
      pointerEvents="none"
      style={[styles.loupe, { left, top, borderColor: pick.color ?? colors.border }]}
    >
      <Canvas style={styles.loupeCanvas}>
        {/* 짚은 자리가 돋보기 한가운데 오도록: 화면좌표 = (캔버스좌표 - 손가락) × 배율 + 반지름 */}
        <Group
          transform={[
            { translateX: radius - fingerX * LOUPE_ZOOM },
            { translateY: radius - fingerY * LOUPE_ZOOM },
            { scale: LOUPE_ZOOM },
          ]}
        >
          {content}
        </Group>
      </Canvas>

      <View style={styles.crosshair} />
    </View>
  );
}

/**
 * 돋보기 안의 모눈. 밖의 모눈(GraphPaper)은 SVG라 Skia 캔버스에 들어갈 수 없어
 * 같은 칸 수로 다시 그린다 — 칸이 어긋나면 확대한 자리가 어디인지 알 수 없다.
 */
function LoupeGrid({ size }: { size: number }) {
  const step = size / GRAPH_CELLS;
  // Group이 통째로 확대하므로 선 굵기는 배율로 나눠야 화면에서 실선 한 겹으로 보인다.
  const width = 1 / LOUPE_ZOOM;

  return (
    <Group color="rgba(122,104,84,0.11)">
      {Array.from({ length: GRAPH_CELLS + 1 }, (_, i) => (
        <Line
          key={`v${i}`}
          p1={vec(i * step, 0)}
          p2={vec(i * step, size * CANVAS_ASPECT)}
          strokeWidth={width}
        />
      ))}
      {Array.from({ length: Math.ceil(GRAPH_CELLS * CANVAS_ASPECT) + 1 }, (_, i) => (
        <Line
          key={`h${i}`}
          p1={vec(0, i * step)}
          p2={vec(size, i * step)}
          strokeWidth={width}
        />
      ))}
    </Group>
  );
}

const styles = StyleSheet.create({
  loupe: {
    position: 'absolute',
    width: LOUPE_SIZE,
    height: LOUPE_SIZE,
    borderRadius: LOUPE_SIZE / 2,
    borderWidth: 3,
    backgroundColor: colors.cardSolid,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loupeCanvas: {
    width: LOUPE_SIZE,
    height: LOUPE_SIZE,
  },
  crosshair: {
    width: CROSSHAIR,
    height: CROSSHAIR,
    borderRadius: CROSSHAIR / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,253,249,0.9)',
  },
  canvas: {
    backgroundColor: colors.cardSolid,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
