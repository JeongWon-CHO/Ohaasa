import { SKETCH_COLORS, type Point, type Sketch, type Stroke } from '@/src/lib/sketch';

/**
 * 스케치북이 "채워졌을 때" 어떤 느낌인지 보려고 만든 샘플 데이터.
 * 난수 낙서로 채우면 그림처럼 안 보여서 판단이 안 되므로, 단순한 도안 몇 개를
 * 손으로 좌표를 찍어 만들고 날짜별로 변형해 쓴다. 프로토타입 전용이다.
 */

const TAU = Math.PI * 2;

function arc(cx: number, cy: number, r: number, from: number, to: number, n = 20): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const t = from + ((to - from) * i) / (n - 1);
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r] as Point;
  });
}

const ring = (cx: number, cy: number, r: number, n = 24) => arc(cx, cy, r, 0, TAU, n);

const line = (x1: number, y1: number, x2: number, y2: number): Point[] => [
  [x1, y1],
  [x2, y2],
];

const poly = (...pts: Point[]): Point[] => pts;

type Doodle = (ink: string, thin: number, thick: number) => Stroke[];

const s = (points: Point[], color: string, width: number): Stroke => ({ points, color, width });

const DOODLES: Doodle[] = [
  // 해
  (ink, thin, thick) => [
    s(ring(0.5, 0.45, 0.16), ink, thick),
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (TAU * i) / 8;
      return s(
        line(
          0.5 + Math.cos(a) * 0.22,
          0.45 + Math.sin(a) * 0.22,
          0.5 + Math.cos(a) * 0.3,
          0.45 + Math.sin(a) * 0.3,
        ),
        ink,
        thin,
      );
    }),
  ],

  // 웃는 얼굴
  (ink, thin, thick) => [
    s(ring(0.5, 0.5, 0.28), ink, thick),
    s(ring(0.41, 0.43, 0.022, 10), ink, thick),
    s(ring(0.59, 0.43, 0.022, 10), ink, thick),
    s(arc(0.5, 0.53, 0.14, 0.25 * Math.PI, 0.75 * Math.PI), ink, thin),
  ],

  // 구름과 비
  (ink, thin, thick) => [
    s(
      [
        ...arc(0.38, 0.4, 0.1, Math.PI, TAU),
        ...arc(0.53, 0.36, 0.13, Math.PI, TAU),
        ...arc(0.66, 0.41, 0.09, Math.PI, TAU),
        [0.28, 0.42],
      ],
      ink,
      thick,
    ),
    ...[0.38, 0.5, 0.62].map((x, i) =>
      s(line(x, 0.5 + i * 0.01, x - 0.04, 0.66 + i * 0.02), ink, thin),
    ),
  ],

  // 커피잔
  (ink, thin, thick) => [
    s(poly([0.34, 0.36], [0.38, 0.68], [0.6, 0.68], [0.64, 0.36], [0.34, 0.36]), ink, thick),
    s(arc(0.66, 0.47, 0.08, -0.5 * Math.PI, 0.5 * Math.PI), ink, thin),
    ...[0.42, 0.5, 0.58].map((x) =>
      s(
        Array.from({ length: 12 }, (_, i) => {
          const t = i / 11;
          return [x + Math.sin(t * TAU) * 0.02, 0.3 - t * 0.12] as Point;
        }),
        ink,
        thin,
      ),
    ),
  ],

  // 나무
  (ink, thin, thick) => [
    s(line(0.5, 0.75, 0.5, 0.5), ink, thick),
    s(ring(0.5, 0.4, 0.2), ink, thick),
    s(line(0.5, 0.6, 0.42, 0.52), ink, thin),
    s(line(0.5, 0.63, 0.58, 0.55), ink, thin),
  ],

  // 산과 해
  (ink, thin, thick) => [
    s(poly([0.18, 0.68], [0.38, 0.36], [0.56, 0.68]), ink, thick),
    s(poly([0.44, 0.68], [0.62, 0.44], [0.8, 0.68]), ink, thin),
    s(ring(0.68, 0.3, 0.07), ink, thin),
    s(line(0.14, 0.7, 0.86, 0.7), ink, thin),
  ],

  // 하트
  (ink, _thin, thick) => [
    s(
      Array.from({ length: 40 }, (_, i) => {
        const t = (i / 39) * TAU;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        return [0.5 + x / 46, 0.48 - y / 46] as Point;
      }),
      ink,
      thick,
    ),
  ],

  // 별
  (ink, _thin, thick) => [
    s(
      Array.from({ length: 11 }, (_, i) => {
        const a = -Math.PI / 2 + (TAU * ((i * 2) % 5)) / 5;
        return [0.5 + Math.cos(a) * 0.26, 0.48 + Math.sin(a) * 0.26] as Point;
      }),
      ink,
      thick,
    ),
  ],

  // 우산
  (ink, thin, thick) => [
    s(arc(0.5, 0.46, 0.26, Math.PI, TAU), ink, thick),
    s(line(0.5, 0.46, 0.5, 0.72), ink, thick),
    s(arc(0.44, 0.72, 0.06, 0, Math.PI), ink, thin),
    ...[-0.13, 0, 0.13].map((dx) => s(line(0.5 + dx, 0.46, 0.5 + dx * 1.4, 0.42), ink, thin)),
  ],

  // 창밖 (창틀 + 달)
  (ink, thin, thick) => [
    s(poly([0.26, 0.24], [0.74, 0.24], [0.74, 0.74], [0.26, 0.74], [0.26, 0.24]), ink, thick),
    s(line(0.5, 0.24, 0.5, 0.74), ink, thin),
    s(line(0.26, 0.49, 0.74, 0.49), ink, thin),
    s(arc(0.62, 0.36, 0.06, 0.3 * Math.PI, 1.5 * Math.PI), ink, thin),
  ],
];

/** 날짜마다 같은 그림이 나오도록 문자열을 시드로 쓴다. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 같은 도안이라도 날짜마다 조금씩 다르게 — 크기·위치·손떨림. */
export function sampleSketchForDate(date: string): Sketch {
  const rand = seededRandom(date);
  const doodle = DOODLES[Math.floor(rand() * DOODLES.length)];
  const ink = SKETCH_COLORS[Math.floor(rand() * SKETCH_COLORS.length)];
  const thin = 0.006;
  const thick = 0.014;

  const scale = 0.82 + rand() * 0.3;
  const dx = (rand() - 0.5) * 0.1;
  const dy = (rand() - 0.5) * 0.1;
  const wobble = 0.004 + rand() * 0.006;

  const strokes = doodle(ink, thin, thick).map((stroke) => ({
    ...stroke,
    points: stroke.points.map(
      ([x, y]) =>
        [
          0.5 + (x - 0.5) * scale + dx + (rand() - 0.5) * wobble,
          0.5 + (y - 0.5) * scale + dy + (rand() - 0.5) * wobble,
        ] as Point,
    ),
  }));

  return { version: 1, aspect: 1, strokes };
}

const SAMPLE_MOODS = [20, 40, 60, 60, 80, 80, 80, 100] as const;
const SAMPLE_SUMMARIES = [
  '생각보다 괜찮았던 하루',
  '조용히 지나간 하루',
  '커피가 유난히 맛있던 날',
  '조금 지쳤던 하루',
  '오랜만에 웃었다',
  '',
];

/** 스케치북을 채워볼 때 쓰는 하루치 샘플 (그림 + 기분 + 한마디). */
export function sampleJournalDraftForDate(date: string) {
  const rand = seededRandom(`${date}:meta`);
  return {
    sketch: sampleSketchForDate(date),
    mood: SAMPLE_MOODS[Math.floor(rand() * SAMPLE_MOODS.length)],
    summary: SAMPLE_SUMMARIES[Math.floor(rand() * SAMPLE_SUMMARIES.length)],
  };
}
