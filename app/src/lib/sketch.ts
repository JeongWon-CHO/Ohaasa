import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 그림은 PNG가 아니라 stroke 배열(벡터)로 저장한다.
 * - 용량이 PNG의 1/10 이하라 서버 동기화를 붙여도 egress 부담이 없다
 * - 어떤 크기로 다시 그려도 안 깨진다(목록 썸네일 · 상세 · 공유 카드)
 * - 나중에 수정 · 되감기 같은 걸 붙일 수 있다
 *
 * 좌표는 픽셀이 아니라 **캔버스 폭으로 정규화한 값**이다.
 * 기기마다 캔버스 폭이 다르므로 픽셀로 저장하면 다른 기기에서 그림이 어긋나고
 * 썸네일을 그릴 때마다 스케일을 다시 맞춰야 한다.
 * x·y를 **둘 다 폭으로** 나누는 게 핵심 — 높이로 나누면 캔버스 비율이 바뀔 때
 * 원이 타원이 된다. 그래서 y의 범위는 0~1이 아니라 0~CANVAS_ASPECT다.
 */
export const CANVAS_ASPECT = 1;

/**
 * 크레파스 한 통 느낌으로 12색. 처음엔 부담을 줄이려고 5색만 뒀는데,
 * 그림일기에서는 색을 고르는 것 자체가 재미라 늘렸다.
 * 앱 배경이 크림색이라 너무 연한 색은 안 보여서 전반적으로 채도를 올렸다.
 */
export const SKETCH_COLORS = [
  '#2C2416', // 먹
  '#A0714A', // 갈색
  '#E4572E', // 빨강
  '#F2913D', // 주황
  '#E0B33C', // 노랑
  '#8CBF4B', // 연두
  '#4A9D5F', // 초록
  '#6FB3D9', // 하늘
  '#3F6FA8', // 파랑
  '#8B6FBF', // 보라
  '#C64B7B', // 자주
  '#E48BB0', // 분홍
] as const;

/**
 * 굵기는 캔버스 폭 대비 비율이다(좌표와 같은 단위라 확대해도 함께 간다).
 * 폭 350px 기준 약 1.4px ~ 16px.
 */
export const BRUSH_WIDTH_MIN = 0.004;
export const BRUSH_WIDTH_MAX = 0.045;
export const BRUSH_WIDTH_DEFAULT = 0.014;

export type Point = [number, number];

/**
 * 브러시 재질. **획마다 저장한다** — 나중에 다시 열었을 때 그릴 당시의 질감이
 * 그대로 나와야 하고, 한 그림 안에서 재질을 섞어 쓸 수도 있어야 하기 때문이다.
 * 기존 데이터에는 이 필드가 없으므로 optional로 두고 없으면 'pen'으로 읽는다.
 */
export type BrushKind = 'pen' | 'crayon' | 'pencil';

export const BRUSHES: { kind: BrushKind; label: string }[] = [
  { kind: 'pen', label: '펜' },
  { kind: 'crayon', label: '크레파스' },
  { kind: 'pencil', label: '연필' },
];

export interface Stroke {
  points: Point[];
  color: string;
  /** 캔버스 폭 대비 비율. 좌표와 같은 단위여야 확대해도 선 굵기가 함께 간다. */
  width: number;
  /** 없으면 'pen' — 이 필드가 생기기 전에 저장된 그림 때문에 optional이다. */
  brush?: BrushKind;
}

export interface Sketch {
  version: 1;
  aspect: number;
  strokes: Stroke[];
}

export function emptySketch(): Sketch {
  return { version: 1, aspect: CANVAS_ASPECT, strokes: [] };
}

/**
 * 소수점 4자리. 폭 1000px 캔버스에서 0.1px 정밀도라 눈으로는 차이가 없고,
 * 자리수를 그대로 두는 것보다 직렬화 용량이 절반 가까이 줄어든다.
 */
const COORD_PRECISION = 10_000;

function round(value: number): number {
  return Math.round(value * COORD_PRECISION) / COORD_PRECISION;
}

export function serializeSketch(sketch: Sketch): string {
  return JSON.stringify({
    ...sketch,
    strokes: sketch.strokes.map((s) => ({
      ...s,
      points: s.points.map(([x, y]) => [round(x), round(y)] as Point),
    })),
  });
}

export function deserializeSketch(raw: string): Sketch | null {
  try {
    const parsed = JSON.parse(raw) as Sketch;
    if (parsed?.version !== 1 || !Array.isArray(parsed.strokes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 터치 좌표를 그대로 이어붙이면 선이 각지게 보인다.
 * 각 점을 제어점으로 두고 이웃한 두 점의 중점끼리 이차 베지어로 잇는 표준 기법 —
 * 점을 추가로 만들지 않으면서 곡선이 부드러워진다.
 */
export function strokeToPath(stroke: Stroke, size: number): string {
  const pts = stroke.points;
  if (pts.length === 0) return '';

  const x = (i: number) => pts[i][0] * size;
  const y = (i: number) => pts[i][1] * size;

  // 톡 찍은 점. 길이 0인 path는 렌더되지 않으므로 아주 짧은 선을 그어
  // strokeLinecap="round"가 원을 만들게 한다.
  if (pts.length === 1) {
    return `M${x(0)} ${y(0)}L${x(0) + 0.01} ${y(0)}`;
  }

  let d = `M${x(0)} ${y(0)}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const midX = (x(i) + x(i + 1)) / 2;
    const midY = (y(i) + y(i + 1)) / 2;
    d += `Q${x(i)} ${y(i)} ${midX} ${midY}`;
  }
  d += `L${x(pts.length - 1)} ${y(pts.length - 1)}`;
  return d;
}

export function countPoints(sketch: Sketch): number {
  return sketch.strokes.reduce((sum, s) => sum + s.points.length, 0);
}

const STORAGE_KEY = 'ohaasa:sketch_prototype:v1';

// 프로토타입이라 AsyncStorage를 쓴다. 실제로는 하루 1장 × 365일이 쌓이므로
// expo-file-system에 날짜별 파일로 나눠야 한다(AsyncStorage는 안드로이드에서
// 전체 6MB 제한이 있고, 한 키를 통째로 읽고 쓰는 구조라 갈수록 느려진다).
export async function saveSketch(sketch: Sketch): Promise<number> {
  const raw = serializeSketch(sketch);
  await AsyncStorage.setItem(STORAGE_KEY, raw);
  return raw.length;
}

export async function loadSketch(): Promise<Sketch | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? deserializeSketch(raw) : null;
}
