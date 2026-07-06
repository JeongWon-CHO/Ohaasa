import { useEffect, useRef, useState } from "react";

import { requestPushToken } from "@/src/lib/notifications";
import {
  getHasAskedPushPermission,
  setHasAskedPushPermission,
  getPushToken,
  setPushToken,
  setPlatform,
  setNotificationsEnabled,
  getOrCreateDeviceId,
} from "@/src/lib/storage";
import { upsertDevice } from "@/src/lib/supabase";
import type { ZodiacSign } from "@/src/constants/zodiac";

interface Options {
  loading: boolean;
  zodiacSign: ZodiacSign | null;
}

export function usePushPermissionPrompt({ loading, zodiacSign }: Options) {
  const [pushSheetVisible, setPushSheetVisible] = useState(false);
  const hasCheckedPermission = useRef(false);

  useEffect(() => {
    if (loading || !zodiacSign || hasCheckedPermission.current) return;
    hasCheckedPermission.current = true;

    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      const [asked, existingToken] = await Promise.all([
        getHasAskedPushPermission(),
        getPushToken(),
      ]);

      if (asked) return;

      if (existingToken) {
        await setHasAskedPushPermission();
        return;
      }

      timer = setTimeout(() => setPushSheetVisible(true), 1000);
    })();

    return () => clearTimeout(timer);
  }, [loading, zodiacSign]);

  async function handlePushAccept() {
    setPushSheetVisible(false);
    await setHasAskedPushPermission();

    const { token, platform } = await requestPushToken();
    await setPushToken(token);
    await setPlatform(platform);
    const notificationsEnabled = token !== null;
    await setNotificationsEnabled(notificationsEnabled);

    if (zodiacSign) {
      const deviceId = await getOrCreateDeviceId();
      await upsertDevice({
        deviceId,
        zodiacSign,
        pushToken: token,
        platform,
        notificationsEnabled,
      });
    }
  }

  async function handlePushDecline() {
    setPushSheetVisible(false);
    await setHasAskedPushPermission();
  }

  return { pushSheetVisible, handlePushAccept, handlePushDecline };
}
