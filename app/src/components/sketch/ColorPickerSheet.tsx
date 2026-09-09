import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { BottomSheet } from '@/src/components/common/BottomSheet';
import { colors, radius, spacing } from '@/src/constants/design';
import { hsvToHex } from '@/src/lib/sketch';

interface ColorPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (color: string) => void;
}

/**
 * 색상 레일에 깔 무지개. 360도를 한 바퀴 돌아 처음 색으로 닫아야
 * 오른쪽 끝과 왼쪽 끝이 이어져 보인다.
 */
const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360].map((h) => hsvToHex(h, 1, 1)) as [
  string,
  string,
  ...string[],
];

const SHADE_OVERLAY = ['rgba(0,0,0,0)', 'rgba(0,0,0,1)'] as const;

const SQUARE_HEIGHT = 190;
const RAIL_HEIGHT = 14;
const RAIL_THUMB = 24;
const KNOB = 22;

/** 앱의 살구 톤 언저리에서 시작한다. */
const DEFAULT = { hue: 20, sat: 0.62, val: 0.85 };

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}

export function ColorPickerSheet({ visible, onClose, onSelect }: ColorPickerSheetProps) {
  const [hue, setHue] = useState(DEFAULT.hue);
  const [sat, setSat] = useState(DEFAULT.sat);
  const [val, setVal] = useState(DEFAULT.val);

  const [railWidth, setRailWidth] = useState(0);
  const [square, setSquare] = useState({ width: 0, height: 0 });

  const railOriginRef = useRef(0);
  const squareOriginRef = useRef({ x: 0, y: 0 });

  // 시트는 닫아도 언마운트되지 않으므로 마지막에 고른 자리가 그대로 남는다.
  // 다시 열었을 때 처음부터 찾게 하지 않으려는 것이다.
  const color = hsvToHex(hue, sat, val);

  // 레이아웃 값만 의존성으로 둔다. 매 렌더 바뀌는 값을 넣으면 드래그가 조용히
  // 끊긴다 (→ BrushSizeSlider).
  const squarePan = useMemo(
    () =>
      // 두 ref 모두 드래그 중에만 읽는 가변 상태다. 린터가 create 안쪽을 보지 못해 오탐이 난다.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (evt) => {
          const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
          // 사각형의 화면 원점. measureInWindow는 비동기라 첫 move가 먼저 오면 값이 튄다.
          squareOriginRef.current = { x: pageX - locationX, y: pageY - locationY };
          setSat(clamp01(locationX / (square.width || 1)));
          setVal(1 - clamp01(locationY / (square.height || 1)));
        },

        onPanResponderMove: (evt) => {
          const { x, y } = squareOriginRef.current;
          setSat(clamp01((evt.nativeEvent.pageX - x) / (square.width || 1)));
          setVal(1 - clamp01((evt.nativeEvent.pageY - y) / (square.height || 1)));
        },
      }),
    [square.width, square.height],
  );

  const railPan = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (evt) => {
          const { pageX, locationX } = evt.nativeEvent;
          railOriginRef.current = pageX - locationX;
          setHue(clamp01(locationX / (railWidth || 1)) * 360);
        },

        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.pageX - railOriginRef.current;
          setHue(clamp01(x / (railWidth || 1)) * 360);
        },
      }),
    [railWidth],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>색 고르기</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Feather name="x" size={20} color={colors.textSoft} />
        </Pressable>
      </View>
      <Text style={styles.description}>아래 무지개로 색상을 고르고, 사각형에서 농도를 정해요</Text>

      {/*
        HSV 사각형. 흰색 → 색상 가로 그라데이션 위에 투명 → 검정 세로 그라데이션을
        겹치면 가로가 채도, 세로가 명도인 판이 된다. 왼쪽 끝은 채도가 0이라
        흰색에서 검정까지의 무채색 칸이 되고, 그래서 회색도 여기서 나온다.
      */}
      <View
        style={styles.square}
        onLayout={(e) =>
          setSquare({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }
        {...squarePan.panHandlers}
      >
        <LinearGradient
          colors={['#FFFFFF', hsvToHex(hue, 1, 1)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, styles.squareLayer]}
        />
        <LinearGradient
          colors={SHADE_OVERLAY}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.squareLayer]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.knob,
            {
              left: sat * square.width - KNOB / 2,
              top: (1 - val) * square.height - KNOB / 2,
              backgroundColor: color,
            },
          ]}
        />
      </View>

      <View
        style={styles.railWrap}
        onLayout={(e) => setRailWidth(e.nativeEvent.layout.width)}
        {...railPan.panHandlers}
      >
        <LinearGradient
          colors={HUE_STOPS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.rail}
        />
        <View
          pointerEvents="none"
          style={[
            styles.railThumb,
            { left: (hue / 360) * railWidth - RAIL_THUMB / 2, backgroundColor: hsvToHex(hue, 1, 1) },
          ]}
        />
      </View>

      <Text style={styles.hex}>{color.toUpperCase()}</Text>

      <Pressable
        onPress={() => {
          onSelect(color);
          onClose();
        }}
        style={({ pressed }) => [
          styles.confirm,
          { backgroundColor: color },
          pressed && styles.pressed,
        ]}
      >
        {/* 글자색은 고른 색의 명도를 따라간다 — 연한 색 위의 흰 글자는 읽히지 않는다. */}
        <Text style={[styles.confirmText, val > 0.62 && styles.confirmTextDark]}>
          이 색으로 그리기
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontFamily: 'NotoSansKR_700Bold',
    color: colors.text,
    lineHeight: 25,
  },
  description: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: spacing.lg,
  },

  square: {
    height: SQUARE_HEIGHT,
    borderRadius: radius.md,
    // 그라데이션 두 장이 모서리를 넘지 않게 판이 직접 자른다.
    overflow: 'hidden',
  },
  squareLayer: {
    borderRadius: radius.md,
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 3,
    borderColor: '#FFFDF9',
  },

  railWrap: {
    height: RAIL_THUMB + 10,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  rail: {
    height: RAIL_HEIGHT,
    borderRadius: RAIL_HEIGHT / 2,
  },
  railThumb: {
    position: 'absolute',
    width: RAIL_THUMB,
    height: RAIL_THUMB,
    borderRadius: RAIL_THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFDF9',
  },

  hex: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    letterSpacing: 1,
    color: colors.textSoft,
  },

  confirm: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  confirmText: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: '#FFFDF9',
  },
  confirmTextDark: {
    color: colors.text,
  },
});
