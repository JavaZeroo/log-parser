import { useEffect, useState } from 'react';

const DEFAULT_FONT_SIZE = 16;

function readRootFontSize() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_FONT_SIZE;
  }

  const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) ? size : DEFAULT_FONT_SIZE;
}

export function useRootFontSize() {
  const [fontSize, setFontSize] = useState(() => readRootFontSize());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      setFontSize(readRootFontSize());
    };

    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('app:device-scale-change', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('app:device-scale-change', update);
    };
  }, []);

  return fontSize;
}
