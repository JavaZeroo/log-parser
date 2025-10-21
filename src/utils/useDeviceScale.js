import { useEffect, useMemo, useState } from 'react';

const SCALE_BANDS = [
  { min: 2.5, className: 'dpr-250', scale: 0.8 },
  { min: 2.0, className: 'dpr-200', scale: 0.85 },
  { min: 1.75, className: 'dpr-175', scale: 0.9 },
  { min: 1.5, className: 'dpr-150', scale: 0.925 },
  { min: 1.25, className: 'dpr-125', scale: 0.95 },
];

const DEFAULT_BAND = { min: 1, className: 'dpr-100', scale: 1 };

function getScaleBand(devicePixelRatio) {
  if (!devicePixelRatio || Number.isNaN(devicePixelRatio)) {
    return DEFAULT_BAND;
  }

  return SCALE_BANDS.find(({ min }) => devicePixelRatio >= min) ?? DEFAULT_BAND;
}

/**
 * Tracks the device pixel ratio and exposes a scaling factor that is also
 * mirrored to CSS classes/variables on the document root. This allows us to
 * tweak global spacing and typography for HiDPI displays without relying solely
 * on browser zoom heuristics.
 */
export function useDeviceScale() {
  const [band, setBand] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_BAND;
    return getScaleBand(window.devicePixelRatio || 1);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateBand = () => {
      setBand(getScaleBand(window.devicePixelRatio || 1));
    };

    updateBand();

    window.addEventListener('resize', updateBand);
    window.addEventListener('orientationchange', updateBand);

    const mediaQueries = SCALE_BANDS.map(({ min }) => {
      const query = `(min-resolution: ${min}dppx)`;
      const mql = window.matchMedia?.(query);
      mql?.addEventListener('change', updateBand);
      return mql;
    });

    return () => {
      window.removeEventListener('resize', updateBand);
      window.removeEventListener('orientationchange', updateBand);
      mediaQueries.forEach((mql) => mql?.removeEventListener('change', updateBand));
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const classes = [DEFAULT_BAND, ...SCALE_BANDS].map(({ className }) => className);

    classes.forEach(cls => root.classList.remove(cls));
    root.classList.add(band.className);
    root.style.setProperty('--ui-scale', band.scale.toString());

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:device-scale-change', { detail: band }));
    }
  }, [band]);

  const value = useMemo(() => ({ ...band }), [band]);
  return value;
}
