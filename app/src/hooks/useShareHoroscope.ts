import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

interface Options {
  showToast?: (message: string) => void;
}

export function useShareHoroscope({ showToast }: Options = {}) {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);

  const share = useCallback(async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (e) {
      console.warn('[share] failed', e);
    } finally {
      setSharing(false);
    }
  }, []);

  const saveImage = useCallback(async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const MediaLibrary = await import('expo-media-library');
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        showToast?.('갤러리 접근 권한이 필요해요.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast?.('이미지가 갤러리에 저장되었어요.');
    } catch (e) {
      console.warn('[save] failed', e);
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  return { cardRef, share, sharing, saveImage, saving };
}
