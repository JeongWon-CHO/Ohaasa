import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { ZodiacSign } from '@/src/constants/zodiac';
import { getZodiacSign, setZodiacSign } from '@/src/lib/storage';

type ZodiacContextValue = {
  zodiacSign: ZodiacSign | null;
  loading: boolean;
  setZodiac: (sign: ZodiacSign) => Promise<void>;
};

const ZodiacContext = createContext<ZodiacContextValue | null>(null);

export function ZodiacProvider({ children }: { children: React.ReactNode }) {
  const [zodiacSign, setZodiacSignState] = useState<ZodiacSign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getZodiacSign()
      .then(sign => setZodiacSignState(sign))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setZodiac = useCallback(async (sign: ZodiacSign) => {
    await setZodiacSign(sign);
    setZodiacSignState(sign);
  }, []);

  return (
    <ZodiacContext.Provider value={{ zodiacSign, loading, setZodiac }}>
      {children}
    </ZodiacContext.Provider>
  );
}

export function useZodiacContext() {
  const ctx = useContext(ZodiacContext);
  if (!ctx) throw new Error('useZodiacContext must be used within ZodiacProvider');
  return ctx;
}
