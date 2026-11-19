import { Redirect } from 'expo-router';

/** 기존 링크도 탭 화면으로 연결한다. */
export default function LegacyRoute() {
  return <Redirect href="/(tabs)/stats" />;
}
