import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/src/constants/design';
import { BRUSH_WIDTH_MAX, BRUSH_WIDTH_MIN } from '@/src/lib/sketch';

/**
 * 굵기를 드래그로 고르는 슬라이더.
 *
 * @react-native-community/slider를 쓰면 네이티브 모듈이라 개발 빌드를 다시
 * 만들어야 한다. 캔버스에서 이미 PanResponder를 쓰고 있어서 직접 만드는 편이 싸다.
 *
 * 값은 정규화 단위(캔버스 폭 대비 비율)라 화면 크기가 달라도 같은 굵기가 나온다.
 */

const THUMB = 22;
const TRACK_HEIGHT = 4;

interface BrushSizeSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** 미리보기 점을 실제 획 굵기로 보여주기 위한 기준 폭(캔버스 크기) */
  previewBase: number;
  color: string;
}

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}

export function BrushSizeSlider({
  value,
  onChange,
  previewBase,
  color,
}: BrushSizeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const originRef = useRef(0);

  // trackWidth는 레이아웃 시점에만, onChange는 화면의 setState라 드래그 도중에는
  // 둘 다 바뀌지 않는다. 그래서 의존성으로 둬도 제스처가 끊기지 않는다.
  // (여기에 매 렌더 바뀌는 값을 넣으면 드래그가 조용히 깨진다.)
  const panResponder = useMemo(
    () =>
      // originRef는 드래그 중에만 읽는 가변 상태다. PanResponder 콜백은 네이티브
      // 터치 이벤트로만 호출되고 렌더 중에는 실행되지 않는데, 린터가 create 안쪽을
      // 보지 못해 오탐이 난다.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (evt) => {
          const { pageX, locationX } = evt.nativeEvent;
          // 트랙의 화면 원점. measureInWindow는 비동기라 첫 move가 먼저 오면 값이 튄다.
          originRef.current = pageX - locationX;
          const ratio = clamp01(locationX / (trackWidth || 1));
          onChange(BRUSH_WIDTH_MIN + ratio * (BRUSH_WIDTH_MAX - BRUSH_WIDTH_MIN));
        },

        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.pageX - originRef.current;
          const ratio = clamp01(x / (trackWidth || 1));
          onChange(BRUSH_WIDTH_MIN + ratio * (BRUSH_WIDTH_MAX - BRUSH_WIDTH_MIN));
        },
      }),
    [trackWidth, onChange],
  );

  const ratio = clamp01(
    (value - BRUSH_WIDTH_MIN) / (BRUSH_WIDTH_MAX - BRUSH_WIDTH_MIN),
  );
  const dot = Math.max(value * previewBase, 2);

  return (
    <View style={styles.row}>
      <View
        style={styles.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.rail} />
        <View style={[styles.fill, { width: ratio * trackWidth }]} />
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: ratio * trackWidth - THUMB / 2 }]}
        />
      </View>

      {/* 실제로 그어질 굵기를 그대로 보여준다 — 숫자보다 이게 직관적이다. */}
      <View style={styles.preview}>
        <View
          style={{
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  track: {
    flex: 1,
    height: THUMB + 8,
    justifyContent: 'center',
  },
  rail: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.segmentTrack,
  },
  fill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.apricotDark,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // 가장 굵을 때(약 16px)를 담을 고정 폭 — 점 크기가 변해도 슬라이더가 흔들리지 않는다.
  preview: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
});
