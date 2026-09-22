import {
  DiscretePathEffect,
  FractalNoise,
  Group,
  Path,
} from '@shopify/react-native-skia';
import { Fragment } from 'react';

import { strokeToPath, type BrushKind, type Stroke } from '@/src/lib/sketch';

/**
 * 획 하나를 재질에 맞게 그린다.
 *
 * 반투명 선을 겹치고 점선으로 끊는 방식으로는 크레파스가 안 나온다 —
 * 그건 획 '바깥 윤곽'만 건드리는 것이라 물감 번진 느낌이 된다.
 * 진짜 질감은 획 '안쪽'에 종이 결 구멍이 뚫려야 나오고, 그러려면 픽셀 노이즈가 필요하다.
 * react-native-svg에는 feTurbulence가 없어서(→ MoodFace.tsx 주석) Skia로 그린다.
 *
 * 핵심은 blendMode="dstOut"이다:
 *   ① 먼저 색으로 획을 긋는다
 *   ② 같은 획을 노이즈 셰이더로 한 번 더 긋되 dstOut으로 합성한다
 *      → 노이즈가 진한 자리만큼 ①이 지워진다 = 종이 결이 비쳐 보인다
 * 이 합성이 그룹 안에서만 일어나야 하므로 Group에 layer를 준다.
 * layer가 없으면 캔버스 전체(배경 포함)를 지워 구멍이 뚫린다.
 */

interface BrushSpec {
  /** 저장된 굵기에 곱한다. 크레파스는 원래 뭉툭하다. */
  widthScale: number;
  opacity: number;
  /**
   * 종이 결. freqX와 freqY를 다르게 주면 알갱이가 한 방향으로 늘어나 줄무늬가 된다 —
   * 같게 주면 사방으로 똑같이 퍼져 모래알(스프레이)처럼 보인다.
   */
  freqX: number;
  freqY: number;
  /** 클수록 잔 무늬가 겹친다. 크레파스는 알갱이가 굵으므로 낮게. */
  octaves: number;
  /**
   * 구멍을 얼마나 세게 뚫을지(0~1). 1이면 획 한가운데까지 갉아먹혀 스프레이가 된다.
   * 크레파스는 심이 꽉 차 있고 가장자리·군데군데만 비쳐야 왁스처럼 보인다.
   */
  grainStrength: number;
  /** 획 윤곽을 얼마나 우둘투둘하게 만들지 (0이면 매끈) */
  roughness: number;
  roughLength: number;
}

const BRUSH_SPECS: Record<BrushKind, BrushSpec | null> = {
  // 매끈한 선 — 노이즈도 거칠기도 없다
  pen: null,
  // 왁스가 종이 결에 걸린다: 잘고 촘촘한 결이 가로로 살짝 늘어지고 심은 꽉 차 있다.
  // freq가 낮으면 한 무늬가 커져 큰 얼룩이 된다 — 0.5면 무늬 하나가 약 2px이라 자글자글하다.
  crayon: {
    widthScale: 1.5,
    opacity: 1,
    freqX: 0.5,
    freqY: 0.9,
    octaves: 3,
    grainStrength: 0.5,
    roughness: 0.3,
    roughLength: 1.8,
  },
  // 흑연 가루: 알갱이가 더 잘고 촘촘하며 전체적으로 흐리다
  pencil: {
    widthScale: 0.9,
    opacity: 0.66,
    freqX: 0.85,
    freqY: 1.4,
    octaves: 3,
    grainStrength: 0.65,
    roughness: 0.2,
    roughLength: 1.3,
  },
};

/** 획마다 노이즈 무늬가 달라야 한다. 좌표에서 뽑아 저장 없이 재현되게 한다. */
function seedOf(stroke: Stroke): number {
  let h = 2166136261;
  for (const [x, y] of stroke.points) {
    h ^= Math.round(x * 8191);
    h = Math.imul(h, 16777619);
    h ^= Math.round(y * 8191);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 1024);
}

interface SkiaStrokeProps {
  stroke: Stroke;
  size: number;
  /** 작게 그릴 때는 질감을 접는다 — 알갱이가 뭉쳐 얼룩처럼 보인다. */
  plain?: boolean;
  minWidth?: number;
}

export function SkiaStroke({ stroke, size, plain, minWidth = 0 }: SkiaStrokeProps) {
  const d = strokeToPath(stroke, size);
  if (!d) return null;

  const spec = plain ? null : BRUSH_SPECS[stroke.brush ?? 'pen'];
  const width = Math.max(stroke.width * size * (spec?.widthScale ?? 1), minWidth);

  if (!spec) {
    return (
      <Path
        path={d}
        style="stroke"
        strokeWidth={width}
        strokeCap="round"
        strokeJoin="round"
        color={stroke.color}
      />
    );
  }

  const seed = seedOf(stroke);

  return (
    <Group layer opacity={spec.opacity}>
      <Path
        path={d}
        style="stroke"
        strokeWidth={width}
        strokeCap="round"
        strokeJoin="round"
        color={stroke.color}
      >
        {spec.roughness > 0 && (
          <DiscretePathEffect
            length={spec.roughLength}
            deviation={spec.roughness}
            seed={seed}
          />
        )}
      </Path>

      {/*
        같은 획을 노이즈로 덧그어 구멍을 낸다 — 이게 알갱이가 된다.
        Turbulence가 아니라 FractalNoise를 쓴다: 전자는 노이즈에 절댓값을 씌워
        대비가 뾰족해서 모래알처럼 보이고, 후자는 부드러운 얼룩이 된다.
        Group opacity로 지우는 세기를 낮춰 심이 살아남게 한다.
      */}
      <Group opacity={spec.grainStrength}>
        <Path
          path={d}
          style="stroke"
          strokeWidth={width}
          strokeCap="round"
          strokeJoin="round"
          blendMode="dstOut"
        >
          {spec.roughness > 0 && (
            <DiscretePathEffect
              length={spec.roughLength}
              deviation={spec.roughness}
              seed={seed}
            />
          )}
          <FractalNoise
            freqX={spec.freqX}
            freqY={spec.freqY}
            octaves={spec.octaves}
            seed={seed}
          />
        </Path>
      </Group>
    </Group>
  );
}

export function SkiaStrokes({
  strokes,
  size,
  plain,
  minWidth,
}: {
  strokes: Stroke[];
  size: number;
  plain?: boolean;
  minWidth?: number;
}) {
  return (
    <>
      {strokes.map((stroke, i) => (
        <Fragment key={i}>
          <SkiaStroke stroke={stroke} size={size} plain={plain} minWidth={minWidth} />
        </Fragment>
      ))}
    </>
  );
}
