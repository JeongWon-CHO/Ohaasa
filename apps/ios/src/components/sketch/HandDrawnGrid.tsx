import { memo, useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * 달력 격자를 View 테두리가 아니라 크레파스로 그은 듯한 선으로 그린다.
 *
 * 자로 잰 직선은 종이 다이어리 느낌을 죽인다. 손으로 그은 선은 미세하게 휘고,
 * 크레파스는 종이 결을 타고 넘으며 농도가 들쭉날쭉해진다.
 *
 * feTurbulence 같은 노이즈 필터는 react-native-svg 네이티브에 없으므로
 * (→ MoodFace.tsx 주석) 질감을 다른 방식으로 만든다:
 *   ① 한 선을 여러 번 겹쳐 긋는다 — 겹치는 곳은 진하고 어긋난 곳은 옅어진다
 *   ② 겹은 같은 곡선을 1px 미만으로 민 것이다 (따로 흔들면 두 줄로 갈라져 지저분해진다)
 *   ③ 일부 겹은 점선으로 끊어 종이 결에 걸린 것처럼 만든다
 *
 * 흔들림은 달(月) 문자열을 시드로 삼아 결정론적으로 만든다.
 * 매 렌더 다시 뽑으면 스크롤할 때마다 격자가 떨려서 눈이 피로해진다.
 */

/** 가장자리 선이 Svg 밖으로 나가 잘리지 않도록 두는 여유. */
export const GRID_PAD = 4;

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

interface Wobble {
  pts: [number, number][];
  /** 선 방향에 수직인 단위 벡터 — 겹을 나란히 밀 때 쓴다. */
  nx: number;
  ny: number;
}

/** 직선을 몇 토막으로 나눠 수직 방향으로 흔든 점들. */
function wobbly(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rand: () => number,
  amplitude: number,
): Wobble {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const segments = Math.max(3, Math.min(12, Math.round(length / 34)));

  // 선 방향에 수직인 단위 벡터 — 이 방향으로만 밀어야 선이 길어지거나 짧아지지 않는다.
  const nx = -dy / length;
  const ny = dx / length;

  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    // 양 끝은 덜 흔든다. 끝이 벌어지면 칸이 안 닫힌 것처럼 보인다.
    const taper = Math.sin(t * Math.PI) * 0.8 + 0.2;
    const offset = (rand() - 0.5) * 2 * amplitude * taper;
    pts.push([x1 + dx * t + nx * offset, y1 + dy * t + ny * offset]);
  }

  return { pts, nx, ny };
}

/** 같은 곡선을 수직으로 shift만큼 밀어 path 문자열로 만든다. */
function toPath({ pts, nx, ny }: Wobble, shift: number): string {
  const px = (i: number) => pts[i][0] + nx * shift;
  const py = (i: number) => pts[i][1] + ny * shift;

  let d = `M${px(0).toFixed(2)} ${py(0).toFixed(2)}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const mx = (px(i) + px(i + 1)) / 2;
    const my = (py(i) + py(i + 1)) / 2;
    d += `Q${px(i).toFixed(2)} ${py(i).toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
  }
  const last = pts.length - 1;
  d += `L${px(last).toFixed(2)} ${py(last).toFixed(2)}`;
  return d;
}

interface Pass {
  d: string;
  width: number;
  opacity: number;
  dash?: string;
}

/**
 * 한 줄을 크레파스처럼 여러 겹으로 만든다.
 *
 * 겹마다 흔들림을 따로 뽑으면 선이 두 줄로 갈라져 보여 지저분해진다.
 * **곡선은 하나만 만들고** 겹은 그것을 아주 살짝(1px 미만) 옆으로 민 것으로 둔다 —
 * 농도 차이는 굵기·투명도·끊김에서 나온다.
 */
function crayonLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rand: () => number,
  amplitude: number,
  baseWidth: number,
): Pass[] {
  const wob = wobbly(x1, y1, x2, y2, rand, amplitude);
  return [
    // 본체 — 끊김 없이 한 줄
    { d: toPath(wob, 0), width: baseWidth, opacity: 0.3 },
    // 결을 타고 끊긴 겹
    {
      d: toPath(wob, 0.35),
      width: baseWidth * 0.7,
      opacity: 0.14,
      dash: `${(6 + rand() * 10).toFixed(1)} ${(2 + rand() * 3).toFixed(1)}`,
    },
    // 눌린 자국 — 굵고 아주 옅게
    {
      d: toPath(wob, -0.4),
      width: baseWidth * 1.4,
      opacity: 0.07,
      dash: `${(3 + rand() * 14).toFixed(1)} ${(5 + rand() * 8).toFixed(1)}`,
    },
  ];
}

interface HandDrawnGridProps {
  columns: number;
  cellWidth: number;
  /** 요일 머리글 줄 높이 */
  headerHeight: number;
  rowHeight: number;
  rows: number;
  color: string;
  /** 같은 달이면 같은 흔들림이 나오도록 */
  seed: string;
}

export const HandDrawnGrid = memo(function HandDrawnGrid({
  columns,
  cellWidth,
  headerHeight,
  rowHeight,
  rows,
  color,
  seed,
}: HandDrawnGridProps) {
  const width = cellWidth * columns;
  const height = headerHeight + rowHeight * rows;

  const passes = useMemo(() => {
    const rand = seededRandom(seed);
    const out: Pass[] = [];
    const p = GRID_PAD;

    const xs = Array.from({ length: columns + 1 }, (_, i) => i * cellWidth);
    const ys = [
      0,
      headerHeight,
      ...Array.from({ length: rows }, (_, i) => headerHeight + rowHeight * (i + 1)),
    ];

    for (const [i, x] of xs.entries()) {
      const edge = i === 0 || i === columns;
      out.push(
        ...crayonLine(x + p, p, x + p, height + p, rand, edge ? 1.0 : 1.5, edge ? 1.4 : 1.1),
      );
    }
    for (const [i, y] of ys.entries()) {
      const edge = i === 0 || i === ys.length - 1;
      out.push(
        ...crayonLine(p, y + p, width + p, y + p, rand, edge ? 1.0 : 1.5, edge ? 1.4 : 1.1),
      );
    }
    return out;
  }, [columns, cellWidth, headerHeight, rowHeight, rows, seed, width, height]);

  return (
    <Svg
      width={width + GRID_PAD * 2}
      height={height + GRID_PAD * 2}
      pointerEvents="none"
    >
      {passes.map((p, i) => (
        <Path
          key={i}
          d={p.d}
          stroke={color}
          strokeWidth={p.width}
          strokeOpacity={p.opacity}
          strokeDasharray={p.dash}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </Svg>
  );
});
