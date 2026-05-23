import React from 'react';

// CSS-only smooth collapse using the grid-template-rows: 0fr ↔ 1fr trick.
// The child is always kept mounted (so internal state survives toggling) but
// clipped to height 0 when collapsed. `aria-hidden` mirrors the visual state
// so screen readers skip the collapsed content.
//
// Usage:
//   <SmoothCollapse open={open}>
//     {/* body */}
//   </SmoothCollapse>
//
// Notes:
//   - Wrap your real body in any container with whatever margin/padding you
//     want — SmoothCollapse just provides the clip+animate envelope.
//   - prefers-reduced-motion users get an instant toggle automatically because
//     the transition is targeted on grid-template-rows and respects the system
//     CSS rule that disables transitions globally (see index.css base layer).
export function SmoothCollapse({ open, children, className = '' }) {
  // Material-standard cubic-bezier — handles both open and close gracefully
  // without the snappy feel of pure ease-out.
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${className}`}
      style={{
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0
      }}
      aria-hidden={!open}
    >
      <div className="overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  );
}
