import React, { useState, useRef, useCallback, useEffect } from 'react';

export function ResizablePanel({ children, title, initialHeight = 350, minHeight = 200, maxHeight = 600 }) {
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
    <div 
      ref={panelRef}
      className="chart-panel p-3"
      style={{ height: `${height}px` }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      
      <div 
        className="chart-container" 
        style={{ height: `${height - 60}px` }}
      >
        {children}
      </div>
      
      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
        title="拖拽调整高度"
      />
    </div>
  );
}
