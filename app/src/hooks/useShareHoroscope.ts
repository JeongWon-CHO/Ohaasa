import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export function useShareHoroscope() {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

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

  return { cardRef, share, sharing };
}
