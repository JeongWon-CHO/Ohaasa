import { useCallback, useEffect, useState } from 'react';

import type { ZodiacSign } from '@/src/constants/zodiac';
import { getZodiacSign, setZodiacSign } from '@/src/lib/storage';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to handle zodiac data.';
}

export function useZodiac() {
  const [zodiacSign, setZodiacSignState] = useState<ZodiacSign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const storedZodiacSign = await getZodiacSign();
      setZodiacSignState(storedZodiacSign);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setZodiacSignState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const storedZodiacSign = await getZodiacSign();

        if (isMounted) {
          setZodiacSignState(storedZodiacSign);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError));
          setZodiacSignState(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveZodiacSign = useCallback(async (nextZodiacSign: ZodiacSign) => {
    setSaving(true);
    setError(null);

    try {
      await setZodiacSign(nextZodiacSign);
      setZodiacSignState(nextZodiacSign);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
      throw saveError;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    zodiacSign,
    loading,
    saving,
    error,
    reload,
    saveZodiacSign,
  };
}
