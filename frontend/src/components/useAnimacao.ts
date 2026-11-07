import { useCallback, useEffect, useRef, useState } from 'react';

export function useAnimacao(intervaloMs: number) {
  const timer = useRef<number | null>(null);
  const [animando, setAnimando] = useState(false);

  const parar = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    setAnimando(false);
  }, []);

  useEffect(() => parar, [parar]);

  const animar = useCallback(
    (total: number, aCadaPasso: (i: number) => void, aoTerminar?: () => void) => {
      parar();
      if (total <= 0) {
        aoTerminar?.();
        return;
      }
      setAnimando(true);
      let i = 0;
      aCadaPasso(i++);
      timer.current = window.setInterval(() => {
        if (i >= total) {
          parar();
          aoTerminar?.();
          return;
        }
        aCadaPasso(i++);
      }, intervaloMs);
    },
    [intervaloMs, parar],
  );

  return { animando, animar, parar };
}
