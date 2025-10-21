import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRootFontSize } from '../utils/useRootFontSize.js';

const HEADER_OFFSET_PX = 60;

export function ResizablePanel({
  children,
  title,
  initialHeight = 440,
  minHeight = 200,
  maxHeight = 800,
  actions = null
}) {
  const { t } = useTranslation();
  const rootFontSize = useRootFontSize();
  const pxPerRem = rootFontSize || 16;

  const pxToRem = useCallback((px) => px / pxPerRem, [pxPerRem]);
  const minHeightRem = useMemo(() => pxToRem(minHeight), [minHeight, pxToRem]);
  const maxHeightRem = useMemo(() => pxToRem(maxHeight), [maxHeight, pxToRem]);
  const headerOffsetRem = useMemo(() => pxToRem(HEADER_OFFSET_PX), [pxToRem]);

  const [heightRem, setHeightRem] = useState(() => pxToRem(initialHeight));
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const startY = useRef(0);
  const startHeightRem = useRef(0);

  const handleMouseMove = useCallback((event) => {
    if (!isResizing) return;

    const deltaRem = (event.clientY - startY.current) / pxPerRem;
    const nextHeightRem = Math.min(
      Math.max(startHeightRem.current + deltaRem, minHeightRem),
      maxHeightRem
    );
    setHeightRem(nextHeightRem);
  }, [isResizing, maxHeightRem, minHeightRem, pxPerRem]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;

    const stopResize = () => handleMouseUp();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResize);
    };
  }, [handleMouseMove, handleMouseUp, isResizing]);

  const handleMouseDown = useCallback((event) => {
    setIsResizing(true);
    startY.current = event.clientY;
    startHeightRem.current = heightRem;
    event.preventDefault();
    event.stopPropagation();
  }, [heightRem]);

  const handleKeyboardResize = useCallback((event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }

    event.preventDefault();
    const deltaRem = (event.key === 'ArrowUp' ? -10 : 10) / pxPerRem;
    const nextHeightRem = Math.min(
      Math.max(heightRem + deltaRem, minHeightRem),
      maxHeightRem
    );
    setHeightRem(nextHeightRem);
  }, [heightRem, maxHeightRem, minHeightRem, pxPerRem]);

  const panelTitleId = `panel-title-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const contentHeightRem = Math.max(heightRem - headerOffsetRem, minHeightRem - headerOffsetRem);

  return (
    <section
      ref={panelRef}
      className="chart-panel p-3"
      style={{ height: `${heightRem}rem` }}
      aria-labelledby={panelTitleId}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3
          id={panelTitleId}
          className="text-base font-semibold text-gray-800 dark:text-gray-100"
        >
          📊 {title}
        </h3>
        {actions && (
          <div className="flex gap-2" aria-label={t('chart.actions')}>
            {actions}
          </div>
        )}
      </div>

      <div
        className="chart-container"
        style={{ height: `${contentHeightRem}rem` }}
        role="img"
        aria-label={`${title} ${t('chart')}`}
      >
        {children}
      </div>

      <button
        className="resize-handle"
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyboardResize}
        title={t('resize.drag')}
        aria-label={t('resize.adjust', { title })}
        tabIndex={0}
        type="button"
      />
    </section>
  );
}
