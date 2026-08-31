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
 * 색과 굵기를 일부러 적게 뒀다. 넓은 팔레트는 "잘 그려야 한다"는 부담을 만들어
 * 매일 쓰는 앱에서는 오히려 이탈 요인이 된다.
 */
export const SKETCH_COLORS = ['#2C2416', '#D98A68', '#7BAEC7', '#C9A227', '#9B85C4'] as const;

/** 캔버스 폭 대비 비율 — 폭 340px 기준 약 2px · 5px · 10px */
export const SKETCH_WIDTHS = [0.006, 0.014, 0.03] as const;

export type Point = [number, number];

export interface Stroke {
  points: Point[];
  color: string;
  /** 캔버스 폭 대비 비율. 좌표와 같은 단위여야 확대해도 선 굵기가 함께 간다. */
  width: number;
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
