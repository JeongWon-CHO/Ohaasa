import { useCallback, useState } from 'react';
import type { ZodiacSign } from '@/src/constants/zodiac';
import { useZodiacContext } from '@/src/context/ZodiacContext';

export function useZodiac() {
  const { zodiacSign, loading, setZodiac } = useZodiacContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveZodiacSign = useCallback(async (nextZodiacSign: ZodiacSign) => {
    setSaving(true);
    setError(null);

    try {
      await setZodiac(nextZodiacSign);
    } catch (saveError) {
      const msg = saveError instanceof Error ? saveError.message : 'Failed to handle zodiac data.';
      setError(msg);
      throw saveError;
    } finally {
      setSaving(false);
    }
  }, [setZodiac]);

  return {
    zodiacSign,
    loading,
    saving,
    error,
    saveZodiacSign,
  };
}
