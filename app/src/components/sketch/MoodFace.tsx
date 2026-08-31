import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * assets/images/feeling-rn/mood-0*.svg 를 옮긴 것.
 *
 * 원본(assets/images/feeling/)에는 crayon(feTurbulence + feDisplacementMap)과
 * grain 필터가 걸려 있는데, react-native-svg 15.15.4의 네이티브 구현에는
 * FeBlend · FeColorMatrix · FeComposite · FeFlood · FeGaussianBlur · FeMerge ·
 * FeOffset만 있어서 노이즈 계열이 렌더되지 않는다.
 * feeling-rn 쪽은 그 흔들림을 패스에 미리 구워 넣은 버전이라 필터 없이도
 * 손그림 느낌이 남는다. 색을 바꾸거나 다시 구울 일이 생기면 원본을 봐야 한다.
 *
 * viewBox가 64×64 고정이라 size만 바꾸면 선 굵기까지 함께 스케일된다.
 */

const INK = '#5A4636';

interface MoodLevel {
  /** 저장되는 값 (0~100) */
  value: number;
  label: string;
  fill: string;
  blob: string;
  /** fill로 그리는 이목구비 (눈동자 · 벌린 입) */
  solids: string[];
  /** stroke로 그리는 이목구비 (감은 눈 · 선으로 된 입) */
  lines: string[];
}

/** 화면에 놓이는 순서(나쁨 → 좋음) */
export const MOOD_LEVELS: MoodLevel[] = [
  {
    value: 20,
    label: '힘들었어',
    fill: '#C3B5DE',
    blob: 'M32.1 3.6C41.6 3.1 50.6 7.4 55.7 14C60.8 20.7 61.4 29 59.2 36.3C57 43.7 51.3 50.6 44.1 54.7C36.8 58.8 27.5 59.6 20.3 56.4C13.1 53.2 7.4 46.4 5.3 39C3.2 31.5 4.7 23.4 9.2 17.1C13.7 10.7 21.9 4.1 32.1 3.6Z',
    solids: [
      'M25.2 42.1C24.8 35.6 27.6 32.4 32.1 32.4C36.6 32.4 39.5 35.6 39.1 42.1C39.1 45 36 46.4 32.2 46.4C28.4 46.4 25.3 45 25.2 42.1Z',
    ],
    lines: [
      'M18.2 23.9C20.5 28.4 26.2 28.6 28.4 24.3',
      'M36 24.3C38.2 28.6 44 28.4 46.2 23.9',
    ],
  },
  {
    value: 40,
    label: '아쉬웠어',
    fill: '#A6C4E4',
    blob: 'M32.8 3.5C42.2 3.9 50.4 8.1 55.3 14.6C60.3 21.2 61.3 29.4 59.2 36.7C57.1 44 51.6 50.9 44.4 54.9C37.1 59 27.7 59.9 20.4 56.6C13.1 53.4 7.3 46.4 5.2 38.9C3.2 31.4 4.9 23.3 9.5 17C14.1 10.6 22.6 3.1 32.8 3.5Z',
    solids: [],
    lines: [
      'M18.3 24.9C20.4 28.9 26 29.2 28.3 25.4',
      'M36.1 25.4C38.3 29.2 44 28.9 46 24.9',
      'M26 43.2C29.9 38.3 34.5 38.4 38.2 43',
    ],
  },
  {
    value: 60,
    label: '그저 그랬어',
    fill: '#E9DCC3',
    blob: 'M31.4 3.7C40.9 3.4 49.6 7.2 54.9 13.6C60.3 20 61.6 28.2 59.7 35.6C57.9 43 52.7 50.3 45.5 54.6C38.2 58.9 28.9 60.2 21.4 57.4C13.9 54.6 7.6 48 5.1 40.4C2.6 32.7 4 24.2 8.4 17.6C12.8 11 21 4 31.4 3.7Z',
    solids: [
      'M23.1 27.4C23.1 25.8 24.2 24.6 25.6 24.6C27.1 24.6 28.2 25.9 28.1 27.5C28.1 29 27 30.2 25.5 30.1C24.1 30.1 23.1 28.9 23.1 27.4Z',
      'M36.4 27.5C36.4 25.9 37.5 24.6 38.9 24.6C40.4 24.6 41.4 25.8 41.4 27.4C41.4 28.9 40.4 30.1 38.9 30.1C37.5 30.2 36.4 29 36.4 27.5Z',
    ],
    lines: ['M25.2 40.8C30 41.4 34.6 41.3 39.1 40.6'],
  },
  {
    value: 80,
    label: '괜찮았어',
    fill: '#F4B49B',
    blob: 'M33.2 3.8C42.6 4.4 50.8 8.9 55.6 15.6C60.4 22.4 60.7 30.3 58.4 37.2C56.1 44.2 51 50.5 44 54.6C37 58.7 28 59.7 20.8 56.9C13.5 54 7.6 47.4 5.2 40C2.9 32.6 4.2 24.3 8.7 17.7C13.2 11.1 22 3.2 33.2 3.8Z',
    solids: [
      'M23.1 27.4C23.1 25.8 24.2 24.6 25.6 24.6C27.1 24.6 28.2 25.9 28.1 27.5C28.1 29 27 30.2 25.5 30.1C24.1 30.1 23.1 28.9 23.1 27.4Z',
      'M36.4 27.5C36.4 25.9 37.5 24.6 38.9 24.6C40.4 24.6 41.4 25.8 41.4 27.4C41.4 28.9 40.4 30.1 38.9 30.1C37.5 30.2 36.4 29 36.4 27.5Z',
    ],
    lines: ['M23.4 36.9C26.4 43.4 37.6 43.8 41.2 36.6'],
  },
  {
    value: 100,
    label: '행복했어',
    fill: '#F6D06B',
    blob: 'M32.5 3.6C41.4 3.2 50.2 7.6 55.2 14.2C60.3 20.9 61.2 28.4 59.4 35.4C57.6 42.6 52.2 50.6 44.8 55.1C37.3 59.7 27.6 60.8 20.2 57.7C12.7 54.6 6.8 48.4 4.7 40.9C2.6 33.3 3.6 24.9 7.7 18.1C11.9 11.2 20.4 4.1 32.5 3.6Z',
    solids: [
      'M22.2 36.1C28.7 35.4 35.4 35.4 41.9 36.2C42.3 42.2 38.1 47.2 32.2 47.3C26.2 47.4 21.8 42.3 22.2 36.1Z',
    ],
    lines: [
      'M18.4 27.3C20.2 23.6 26.1 23.4 28.1 27.1',
      'M36.2 27.1C38.1 23.4 44 23.6 45.8 27.3',
    ],
  },
];

/** 저장된 0~100 값에서 가장 가까운 표정. 나중에 슬라이더로 바꿔도 그대로 쓴다. */
export function moodLevelFor(value: number): MoodLevel {
  return MOOD_LEVELS.reduce((best, level) =>
    Math.abs(level.value - value) < Math.abs(best.value - value) ? level : best,
  );
}

interface MoodFaceProps {
  /** 0~100 */
  mood: number;
  size: number;
  /** 고르지 않은 상태 — 테두리 대신 투명도로만 구분한다. */
  dimmed?: boolean;
}

export const MoodFace = memo(function MoodFace({ mood, size, dimmed }: MoodFaceProps) {
  const level = moodLevelFor(mood);

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" opacity={dimmed ? 0.4 : 1}>
      <Path d={level.blob} fill={level.fill} />
      {level.solids.map((d, i) => (
        <Path key={`s${i}`} d={d} fill={INK} />
      ))}
      {level.lines.map((d, i) => (
        <Path
          key={`l${i}`}
          d={d}
          fill="none"
          stroke={INK}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
});
