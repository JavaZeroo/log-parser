import React, { useState, useRef, useCallback, useEffect } from 'react';

export function ResizablePanel({ children, title, initialHeight = 440, minHeight = 200, maxHeight = 800 }) {
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaY = e.clientY - startY.current;
    const newHeight = Math.min(Math.max(startHeight.current + deltaY, minHeight), maxHeight);
    setHeight(newHeight);
  }, [isResizing, minHeight, maxHeight]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
    startY.current = e.clientY;
    startHeight.current = height;
    e.preventDefault();
    e.stopPropagation();
  }, [height]);

  return (
    <section 
      ref={panelRef}
        className="chart-panel p-3 dark:text-gray-100"
      style={{ height: `${height}px` }}
      aria-labelledby={`panel-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 
          id={`panel-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="text-base font-semibold text-gray-800 dark:text-gray-100"
        >
          📊 {title}
        </h3>
      </div>
      
      <div 
        className="chart-container" 
        style={{ height: `${height - 60}px` }}
        role="img"
        aria-label={`${title} 图表`}
      >
        {children}
      </div>
      
      <button
        className="resize-handle"
        onMouseDown={handleMouseDown}
        title="拖拽调整图表高度"
        aria-label={`调整 ${title} 图表高度`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const delta = e.key === 'ArrowUp' ? -10 : 10;
            const newHeight = Math.min(Math.max(height + delta, minHeight), maxHeight);
            setHeight(newHeight);
          }
        }}
        tabIndex={0}
      />
    </section>
  );
}
