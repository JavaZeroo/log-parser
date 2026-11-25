import React from 'react';

// Keep controls mounted so input state survives closing and reversing the transition.
export function SmoothCollapse({ open, children, className = '' }) {
  return (
    <div
      className={`smooth-collapse ${className}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  );
}
