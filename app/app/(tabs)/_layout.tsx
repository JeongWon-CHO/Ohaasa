import Feather from "@expo/vector-icons/Feather";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { ColorValue, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/constants/design";
import {
  getOrCreateDeviceId,
  getZodiacSign,
  getNotificationsEnabled,
  getPushToken,
  getPlatform,
} from "@/src/lib/storage";
import { upsertDevice } from "@/src/lib/supabase";

/**
 * 앱의 나머지가 전부 Feather를 쓰는데 탭바만 FontAwesome이라 획 두께가 튀었다.
 * 선택 상태는 색뿐 아니라 획 두께로도 구분한다 — 색만으로는 작은 아이콘에서 잘 안 읽힌다.
 */
function TabBarIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: ColorValue;
  focused: boolean;
}) {
  return (
    <Feather
      name={name}
      size={21}
      color={color as string}
      style={{ marginBottom: -2 }}
      strokeWidth={focused ? 2.4 : 1.8}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const deviceId = await getOrCreateDeviceId();
      const zodiac = await getZodiacSign();
      if (!zodiac) return;

      const [token, platform, notificationsEnabled] = await Promise.all([
        getPushToken(),
        getPlatform(),
        getNotificationsEnabled(),
      ]);

      // const upsertStart = Date.now();
      await upsertDevice({
        deviceId,
        zodiacSign: zodiac,
        pushToken: token,
        platform,
        notificationsEnabled,
      });
      // console.log(`[stats] device upsert: ${Date.now() - upsertStart}ms`);
    })();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.apricotDark,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontFamily: "NotoSansKR_600SemiBold",
        },
        tabBarStyle: {
          height:
            (Platform.OS === "ios" ? 54 : 68) +
            (Platform.OS === "android" ? Math.max(insets.bottom, 10) : insets.bottom),
          paddingTop: 6,
          paddingBottom:
            Platform.OS === "android" ? Math.max(insets.bottom, 10) : insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: "rgba(255,253,249,0.94)",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: "보관함",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="grid" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "커뮤니티",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="message-circle" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "My",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
