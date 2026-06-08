import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/constants/design";
import { requestPushToken } from "@/src/lib/notifications";
import {
  getOrCreateDeviceId,
  getZodiacSign,
  setNotificationsEnabled,
  setPushToken,
  setPlatform,
} from "@/src/lib/storage";
import { upsertDevice } from "@/src/lib/supabase";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const deviceId = await getOrCreateDeviceId();
      const zodiac = await getZodiacSign();
      if (!zodiac) return;

      const { token, platform } = await requestPushToken();
      await setPushToken(token);
      await setPlatform(platform);
      const notificationsEnabled = token !== null;

      await setNotificationsEnabled(notificationsEnabled);
      await upsertDevice({
        deviceId,
        zodiacSign: zodiac,
        pushToken: token,
        platform,
        notificationsEnabled,
      });
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
          title: "Today",
          tabBarIcon: ({ color }) => <TabBarIcon name="sun-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rankings"
        options={{
          title: "전체",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="list-ol" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
