import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ScreenSize = 'compact' | 'regular';

/**
 * safe area를 제외한 실제 사용 가능한 높이 기준으로 레이아웃 티어를 반환한다.
 *   compact : usableHeight < 700dp
 *   regular : usableHeight >= 700dp
 *
 * 개발 중 콘솔에 기기 치수를 출력하므로 브레이크포인트 조정에 활용할 수 있다.
 */
export function useScreenSize(): ScreenSize {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const usableHeight = height - insets.top - insets.bottom;

  return usableHeight < 780 ? 'compact' : 'regular';
}
