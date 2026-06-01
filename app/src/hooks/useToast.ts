import { useCallback, useEffect, useRef, useState } from 'react';

const TOAST_DURATION = 2000;

export function useToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), TOAST_DURATION);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { showToast, toastProps: { message, visible } };
}
