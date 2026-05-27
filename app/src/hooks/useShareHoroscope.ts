import { useCallback, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export function useShareHoroscope() {
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
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '이미지를 저장하려면 갤러리 접근 권한이 필요해요.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '이미지가 갤러리에 저장되었어요.');
    } catch (e) {
      console.warn('[save] failed', e);
    } finally {
      setSaving(false);
    }
  }, []);

  return { cardRef, share, sharing, saveImage, saving };
}
