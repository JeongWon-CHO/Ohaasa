import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

interface Options {
  showToast?: (message: string) => void;
}

export function useShareHoroscope({ showToast }: Options = {}) {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaDeniedSheetVisible, setMediaDeniedSheetVisible] = useState(false);

  const captureCard = useCallback(async () => {
    const card = cardRef.current;
    if (!card) throw new Error("공유할 카드가 없습니다.");
    const size = await new Promise<{ width: number; height: number }>(
      (resolve) => {
        card.measure((_x, _y, width, height) => resolve({ width, height }));
      },
    );
    if (size.width <= 0 || size.height <= 0)
      throw new Error("카드 크기를 확인하지 못했습니다.");
    return captureRef(cardRef, {
      format: "png",
      quality: 1,
      width: 1080,
      height: Math.round((1080 * size.height) / size.width),
    });
  }, []);

  const share = useCallback(async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureCard();
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch (e) {
      console.warn("[share] failed", e);
    } finally {
      setSharing(false);
    }
  }, [captureCard]);

  const saveImage = useCallback(async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const MediaLibrary = await import("expo-media-library/legacy");
      const { status, canAskAgain } =
        await MediaLibrary.requestPermissionsAsync(true);
      if (status !== "granted") {
        if (!canAskAgain) {
          setMediaDeniedSheetVisible(true);
        } else {
          showToast?.("갤러리 접근 권한이 필요해요.");
        }
        return;
      }
      const uri = await captureCard();
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast?.("이미지가 갤러리에 저장되었어요.");
    } catch (e) {
      console.warn("[save] failed", e);
    } finally {
      setSaving(false);
    }
  }, [showToast, captureCard]);

  return {
    cardRef,
    share,
    sharing,
    saveImage,
    saving,
    mediaDeniedSheetVisible,
    closeMediaDeniedSheet: () => setMediaDeniedSheetVisible(false),
  };
}
