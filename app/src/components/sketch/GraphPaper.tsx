import { memo } from 'react';
import Svg, { Line } from 'react-native-svg';

/**
 * 캔버스 바닥에 까는 모눈. 그릴 때와 읽을 때 같은 종이 위에 있어야 하므로
 * DrawingCanvas와 SketchThumbnail이 함께 쓴다.
 *
 * 칸 수를 고정하고 간격을 size로 나눠 정하는 이유: 좌표가 정규화돼 있어서
 * 어떤 크기로 그리든 그림과 모눈의 상대 위치가 같아야 한다.
 * 간격을 px로 고정하면 큰 화면에서 그린 그림이 작은 화면에서 다른 칸에 걸린다.
 */
/** 스포이드 돋보기가 같은 모눈을 Skia로 다시 그릴 때 쓴다 — 두 벌이 되면 칸이 어긋난다. */
export const GRAPH_CELLS = 20;

const CELLS = GRAPH_CELLS;

interface GraphPaperProps {
  size: number;
  /** 세로 길이 비율(정사각이면 1) */
  aspect?: number;
  color?: string;
}

export const GraphPaper = memo(function GraphPaper({
  size,
  aspect = 1,
  color = 'rgba(122,104,84,0.11)',
}: GraphPaperProps) {
  const height = size * aspect;
  const step = size / CELLS;
  const rows = Math.ceil(height / step);

  return (
    <Svg width={size} height={height} pointerEvents="none">
      {Array.from({ length: CELLS + 1 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={i * step}
          y1={0}
          x2={i * step}
          y2={height}
          stroke={color}
          strokeWidth={0.7}
        />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={0}
          y1={i * step}
          x2={size}
          y2={i * step}
          stroke={color}
          strokeWidth={0.7}
        />
      ))}
    </Svg>
  );
});
