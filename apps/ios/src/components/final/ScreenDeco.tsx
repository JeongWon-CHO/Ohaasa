import { View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";

import { colors } from "@/src/constants/design";

type DecoProps = {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
};

export function CircleDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

export function StarDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y, opacity }}
    >
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Polygon
          points="5,0 6.2,3.8 10,3.8 7,6.2 8.2,10 5,7.8 1.8,10 3,6.2 0,3.8 3.8,3.8"
          fill={color}
        />
      </Svg>
    </View>
  );
}

export function MoonDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y, opacity }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

/**
 * 오하아사 화면(`horoscope.tsx`)의 배경 장식 한 벌.
 *
 * 좌표가 하드코딩이라 두 화면이 각자 들고 있으면 한쪽만 손대는 순간
 * "같은 배경"이 아니게 된다. 홈도 이걸 그대로 쓴다.
 */
export function StarfieldDeco() {
  return (
    <>
      <CircleDeco x={-50} y={50} size={170} color={colors.sky} opacity={0.11} />
      <CircleDeco x={230} y={-30} size={160} color={colors.yellow} opacity={0.1} />
      <CircleDeco x={200} y={590} size={160} color={colors.apricot} opacity={0.1} />
      <StarDeco x={46} y={128} size={5} color={colors.yellow} opacity={0.26} />
      <StarDeco x={294} y={108} size={4} color={colors.apricot} opacity={0.22} />
      <StarDeco x={28} y={440} size={3} color={colors.yellow} opacity={0.18} />
      <MoonDeco x={286} y={174} size={22} color={colors.apricot} opacity={0.18} />
    </>
  );
}
