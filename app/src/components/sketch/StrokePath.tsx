import { Fragment } from 'react';
import { Path } from 'react-native-svg';

import { brushPasses, strokeToPath, type Stroke } from '@/src/lib/sketch';

/**
 * 획 하나를 재질에 맞게 그린다. 캔버스와 썸네일이 같은 함수를 쓰므로
 * 그릴 때와 달력 칸에서 본 모습이 어긋나지 않는다.
 */
export function renderStroke(
  stroke: Stroke,
  size: number,
  key: string | number,
  /** 아주 작게 그릴 때는 겹을 접는다 — 점선이 뭉쳐 얼룩처럼 보이기 때문. */
  simplify = false,
  minWidth = 0,
) {
  const d = strokeToPath(stroke, size);
  if (!d) return null;

  const passes = simplify ? [{ widthScale: 1, opacity: 1 }] : brushPasses(stroke.brush);

  return (
    <Fragment key={key}>
      {passes.map((pass, i) => (
        <Path
          key={i}
          d={d}
          stroke={stroke.color}
          strokeWidth={Math.max(stroke.width * size * pass.widthScale, minWidth)}
          strokeOpacity={pass.opacity}
          strokeDasharray={pass.dash}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Fragment>
  );
}
