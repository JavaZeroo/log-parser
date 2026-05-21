import React from 'react';
import { ChevronDown } from 'lucide-react';

// Shared collapsible card header. Pass `collapsible` + `open` + `onToggle` to
// turn any card heading into a clickable expand/collapse trigger. When not
// collapsible, renders a plain heading with optional actions.
//
// titleNode lets callers compose icons / counts inline with the title text.
export function CollapsibleCardHeader({
  title,
  titleNode,
  titleId,
  icon,
  actions,
  collapsible = false,
  open = true,
  onToggle,
  className = ''
}) {
  const headingChildren = (
    <>
      {icon && <span className="text-gray-600 dark:text-gray-300 shrink-0" aria-hidden="true">{icon}</span>}
      {titleNode ?? (
        <h3 id={titleId} className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
          {title}
        </h3>
      )}
    </>
  );

  if (!collapsible) {
    return (
      <div className={`flex items-center justify-between gap-2 ${className}`}>
        <div className="flex items-center gap-2 min-w-0">{headingChildren}</div>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 min-w-0 flex-1 text-left rounded hover:bg-gray-50 dark:hover:bg-gray-700 -mx-1 px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={open}
      >
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform ${open ? '' : '-rotate-90'}`}
          aria-hidden="true"
        />
        {headingChildren}
      </button>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  );
}
